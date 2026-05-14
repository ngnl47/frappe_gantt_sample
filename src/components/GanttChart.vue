<template>
  <div class="gantt-chart-container" ref="containerRef">
    <div v-if="loading" class="loading-overlay">
      <el-icon class="is-loading" size="40"><Loading /></el-icon>
      <span class="ml-2 text-gray-500">加载中...</span>
    </div>

    <div v-if="!loading && realTaskCount === 0" class="empty-state">
      <el-empty description="暂无数据">
        <el-button type="primary" @click="() => store.initPreset()">加载预设数据</el-button>
      </el-empty>
    </div>

    <!-- v1.x: gantt-container 已内置 sticky header -->
    <div ref="ganttRef" class="gantt-wrapper" v-show="!loading && realTaskCount > 0"></div>

    <!-- 自定义 tooltip -->
    <div
      v-if="tooltipVisible"
      class="custom-tooltip"
      :style="{ left: tooltipX + 'px', top: tooltipY + 'px' }"
    >
      <div class="tooltip-title">{{ tooltipData.title }}</div>
      <div class="tooltip-content">{{ tooltipData.content }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { useGanttStore } from '@/stores/ganttStore'
import { ServerMapping } from '@/types'
import { getGanttOptions } from '@/services/ganttAdapter'
import { formatTimestamp } from '@/utils/timeUtils'
import Gantt from 'frappe-gantt'
import type { FrappeGanttTask } from 'frappe-gantt'

// 扩展 FrappeGanttTask 添加自定义属性
interface LocalGanttTask extends FrappeGanttTask {
  _serverId?: number
  _extendsLeft?: boolean
}

const emit = defineEmits<{
  (e: 'taskClick', task: ServerMapping): void
}>()

const store = useGanttStore()

// refs
const containerRef = ref<HTMLDivElement | null>(null)
void containerRef // 用于模板绑定，避免 TS unused warning
const ganttRef = ref<HTMLDivElement | null>(null)
const ganttInstance = ref<Gantt | null>(null)

// Tooltip 状态
const tooltipVisible = ref(false)
const tooltipX = ref(0)
const tooltipY = ref(0)
const tooltipData = ref({ title: '', content: '' })

// 计算属性
const loading = computed(() => store.loading)
const ganttTasks = computed(() => store.ganttTasks)
const mappings = computed(() => store.mappings)

// 实际任务数量（排除锚点任务）
const realTaskCount = computed(() => ganttTasks.value.filter(t => t.id !== '__anchor__').length)

// 初始化甘特图
async function initGantt() {
  if (!ganttRef.value) return

  // 等待 DOM 更新
  await nextTick()

  if (ganttTasks.value.length === 0 || realTaskCount.value === 0) {
    // 清空甘特图
    if (ganttRef.value) {
      ganttRef.value.innerHTML = ''
    }
    ganttInstance.value = null
    return
  }

  // === 关键：在创建 Gantt 之前计算服务器行号 ===
  const serverToRowIndex: Map<number, number> = new Map()
  let rowIndex = 0

  ganttTasks.value.forEach(task => {
    if (task.id === '__anchor__') return
    const serverId = task._serverId
    if (serverId !== undefined && !serverToRowIndex.has(serverId)) {
      serverToRowIndex.set(serverId, rowIndex)
      rowIndex++
    }
  })

  // 转换任务数据，预先设置 _index（v1.x bar 创建时依赖此值）
  const tasks: LocalGanttTask[] = ganttTasks.value.map(task => ({
    id: task.id,
    name: task.name,
    start: task.start,
    end: task.end,
    progress: task.progress,
    dependencies: task.dependencies,
    custom_class: task.custom_class,
    _serverId: task._serverId,
    _extendsLeft: task._extendsLeft,
    // 预设置 _index，同服务器任务使用相同行号
    _index: task.id === '__anchor__' ? -1 : (serverToRowIndex.get(task._serverId!) ?? 0)
  }))

  // 销毁旧实例
  ganttInstance.value = null
  ganttRef.value.innerHTML = ''

  // 创建新实例
  ganttInstance.value = new Gantt(ganttRef.value, tasks, {
    ...getGanttOptions(),
    on_click: (task: LocalGanttTask) => {
      handleTaskClick(task)
    }
  })

  // 保存 serverToRowIndex 供后续使用
  ;(ganttInstance.value as any)._serverToRowIndex = serverToRowIndex

  // 覆盖 Frappe Gantt 的 padding 行为，使时间轴精确显示筛选范围
  const filterStart = store.timeRangeFilter?.start
  const filterEnd = store.timeRangeFilter?.end

  if (filterStart && filterEnd && ganttInstance.value) {
    const gantt = ganttInstance.value as any

    // 左侧额外加一天，为箭头绘制预留空间
    const oneDayMs = 24 * 60 * 60 * 1000
    const ganttStartWithPadding = filterStart - oneDayMs

    // 覆盖 gantt_start/gantt_end
    gantt.gantt_start = new Date(ganttStartWithPadding)
    gantt.gantt_end = new Date(filterEnd)

    // 调用 setup_date_values() 正确生成 dates 数组
    gantt.setup_date_values()

    // 清空容器并重新渲染（包括 HTML header）
    gantt.$svg.innerHTML = ''
    gantt.$header?.remove?.()
    gantt.$side_header?.remove?.()
    gantt.$current_highlight?.remove?.()
    gantt.$extras?.remove?.()
    gantt.render()
  }

  // 渲染完成后：调整行位置 + 添加月份背景色 + 滚动到今天
  await nextTick()
  adjustSameServerBarsToSameRow()
  adjustCurrentHighlight()
  addMonthBackgrounds()
  scrollToToday()
  bindTooltipEvents()
}

// 将同一服务器（k 值相同）的任务块调整到同一行
function adjustSameServerBarsToSameRow() {
  if (!ganttRef.value || !ganttInstance.value) return

  const ganttContainer = ganttRef.value.querySelector('.gantt-container')
  if (!ganttContainer) return

  const svg = ganttContainer.querySelector('svg.gantt')
  if (!svg) return

  // 使用 initGantt 中保存的映射
  const serverToRowIndex = (ganttInstance.value as any)._serverToRowIndex as Map<number, number>
  if (!serverToRowIndex) return

  // 更新 Frappe Gantt 内部 task._index（关键！v1.x 会覆盖我们传入的值）
  const ganttTasksInternal = (ganttInstance.value as any).tasks
  if (ganttTasksInternal) {
    ganttTasksInternal.forEach((task: any) => {
      if (task.id === '__anchor__') return
      const serverId = parseInt(task.id.split('_')[0], 10)
      task._index = serverToRowIndex.get(serverId) ?? 0
    })
  }

  // 从 gantt options 获取实际配置值
  const options = (ganttInstance.value as any).options
  const config = (ganttInstance.value as any).config
  // v1.x: header_height 包含 upper + lower + 10px border/padding
  const headerHeight = config?.header_height || 60
  const barHeight = options.bar_height || 15
  const padding = options.padding || 9
  const rowHeight = barHeight + padding

  // 计算实际的 row 数量
  const totalRows = serverToRowIndex.size

  // 重新创建 grid-row 使其与我们的 row 数量对齐
  const gridLayer = svg.querySelector('.grid')
  if (gridLayer) {
    // 清除原有的 grid-row
    const existingRows = gridLayer.querySelectorAll('.grid-row')
    existingRows.forEach(row => row.remove())

    // 创建新的 grid-row
    const gridWidth = svg.querySelector('.grid-background')?.getAttribute('width') || '0'
    for (let i = 0; i < totalRows; i++) {
      const rowY = headerHeight + i * rowHeight
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.setAttribute('x', '0')
      rect.setAttribute('y', rowY.toString())
      rect.setAttribute('width', gridWidth)
      rect.setAttribute('height', rowHeight.toString())
      rect.setAttribute('class', 'grid-row')
      gridLayer.appendChild(rect)
    }

    // 调整元素顺序：tick 在 grid-row 之上（SVG 渲染顺序取决于 DOM 顺序）
    const ticks = gridLayer.querySelectorAll('.tick')
    ticks.forEach(tick => gridLayer.appendChild(tick))
  }

  // 更新每个 bar 的 y 位置（基于新的 task._index）
  // bar 在 row 中居中: y = rowTop + (rowHeight - barHeight) / 2
  // rowTop = headerHeight + rowIndex * rowHeight
  // 居中 y = headerHeight + rowIndex * rowHeight + padding / 2
  const bars = (ganttInstance.value as any).bars

  if (bars) {
    bars.forEach((bar: any) => {
      if (bar.task.id === '__anchor__') return
      const targetRowIndex = bar.task._index ?? 0

      // bar 在 row 中居中
      const targetY = headerHeight + targetRowIndex * rowHeight + padding / 2

      // 更新 bar 内部的 y 属性
      bar.y = targetY
      bar.$bar.setAttribute('y', targetY.toString())

      // 添加延伸标记类名（v1.x custom_class 只支持单个类名）
      const taskData = ganttTasks.value.find(t => t.id === bar.task.id)
      if (taskData?._extendsLeft) {
        bar.group.classList.add('task-extends-left')
      }

      // 检查是否是持续任务
      const taskIdParts = bar.task.id.split('_')
      const isOngoing = taskIdParts[2] === 'ongoing'

      // 延伸持续任务宽度
      const gridBackground = svg.querySelector('.grid-background')
      const gridWidth = gridBackground ? parseFloat(gridBackground.getAttribute('width') || '0') : 0

      if (isOngoing && gridWidth > 0) {
        const barX = bar.$bar.getX()
        const newWidth = gridWidth - barX + (config?.column_width || 20)
        if (newWidth > 0) {
          bar.$bar.setAttribute('width', newWidth.toString())
          bar.width = newWidth
        }
      }

      // 更新 progress bar
      if (bar.$bar_progress) {
        bar.$bar_progress.setAttribute('y', targetY.toString())
      }

      // 更新 label
      const label = bar.group.querySelector('.bar-label')
      if (label) {
        label.setAttribute('y', (targetY + barHeight / 2).toString())
      }
    })
  }

  // 重新排序 bars 数组，使其顺序与 task._index 一致
  // v1.x make_arrows 使用 bars[task._index]，所以必须对齐
  if (bars) {
    // 按 task._index 排序 bars
    bars.sort((a: any, b: any) => {
      const indexA = a.task._index ?? 0
      const indexB = b.task._index ?? 0
      return indexA - indexB
    })

    // 重新添加到 bar layer（按新顺序）
    const barLayer = svg.querySelector('.bar')
    if (barLayer) {
      barLayer.innerHTML = ''
      bars.forEach((bar: any) => {
        if (bar.task.id !== '__anchor__') {
          barLayer.appendChild(bar.group)
        }
      })
    }
  }

  // 更新箭头：手动创建，不使用 v1.x 的 make_arrows（因为它使用 bars[_index] 会出错）
  const gantt = ganttInstance.value as any
  const arrowLayer = svg.querySelector('.arrow')
  if (arrowLayer && gantt) {
    // 清除旧箭头
    arrowLayer.innerHTML = ''
    gantt.arrows = []

    // 手动创建箭头：遍历任务，根据 dependencies 创建箭头
    const tasks = gantt.tasks
    const bars = gantt.bars

    for (const task of tasks) {
      if (task.id === '__anchor__' || !task.dependencies) continue

      const deps = Array.isArray(task.dependencies) ? task.dependencies : task.dependencies.split(',')

      for (const depId of deps) {
        if (!depId || depId === '__anchor__') continue

        // 找到依赖任务的 bar（使用 find 而不是 bars[_index]）
        const fromBar = bars.find((b: any) => b.task.id === depId)
        const toBar = bars.find((b: any) => b.task.id === task.id)

        if (!fromBar || !toBar) continue

        // 获取正确的 y 位置
        const fromIndex = fromBar.task._index ?? 0
        const toIndex = toBar.task._index ?? 0

        const fromY = headerHeight + fromIndex * rowHeight + padding / 2 + barHeight / 2
        const toY = headerHeight + toIndex * rowHeight + padding / 2 + barHeight / 2

        // 创建箭头 SVG path 元素
        // 箭头从源任务块左边缘出发，到达目标任务块左边缘
        // 同一时间段的任务块在同一列，从左侧出发，向左偏移，然后垂直移动到目标
        const fromX = fromBar.$bar.getX()
        const toX = toBar.$bar.getX()
        const arrowCurve = options.arrow_curve || 5

        // 箭头偏移量（从任务块左边缘向左偏移）
        const offsetX = -15  // 向左延伸15像素，让箭头更明显

        let pathStr = ''
        if (Math.abs(fromY - toY) < 1) {
          // 同一行：水平线（这种情况同一时间段内不应该发生）
          pathStr = `M ${fromX} ${fromY} H ${toX} m -5 -5 l 5 5 l -5 5`
        } else {
          // 不同行：从左侧出发，向左偏移，垂直移动到目标行，再回到目标左边缘
          const exitX = fromX + offsetX  // 从源任务块左边向左偏移一点出发

          if (fromY < toY) {
            // 向下：先向左，再向下，再向右到达目标
            pathStr = `M ${fromX} ${fromY} H ${exitX} V ${toY} H ${toX} m -5 -5 l 5 5 l -5 5`
          } else {
            // 向上：先向左，再向上，再向右到达目标
            pathStr = `M ${fromX} ${fromY} H ${exitX} V ${toY} H ${toX} m -5 -5 l 5 5 l -5 5`
          }
        }

        const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        pathEl.setAttribute('d', pathStr)
        pathEl.setAttribute('class', 'arrow')
        pathEl.setAttribute('data-from', depId)
        pathEl.setAttribute('data-to', task.id)
        arrowLayer.appendChild(pathEl)

        // 保存箭头引用（用于后续更新）
        gantt.arrows.push({
          from_task: fromBar,
          to_task: toBar,
          element: pathEl,
          path: pathStr
        })
      }
    }
  }

  // 调整 layer 顺序
  const barLayer = svg.querySelector('.bar')
  if (arrowLayer && barLayer && arrowLayer.parentElement) {
    arrowLayer.parentElement.appendChild(barLayer)
    arrowLayer.parentElement.appendChild(arrowLayer)
  }
}

// 调整当前日期高亮位置（v1.x 的 current-highlight 定位可能有偏差）
function adjustCurrentHighlight() {
  if (!ganttRef.value || !ganttInstance.value) return

  const ganttContainer = ganttRef.value.querySelector('.gantt-container')
  if (!ganttContainer) return

  const currentHighlight = ganttContainer.querySelector('.current-highlight') as HTMLElement
  if (!currentHighlight) return

  const config = (ganttInstance.value as any).config
  const ganttStart = (ganttInstance.value as any).gantt_start

  if (!ganttStart || !config) return

  // 计算当前日期的正确位置
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const diffDays = Math.floor((today.getTime() - ganttStart.getTime()) / (24 * 60 * 60 * 1000))
  const correctX = diffDays * config.column_width

  // 修正位置：v1.x 的 current-highlight 可能偏移了一天
  currentHighlight.style.left = correctX + 'px'
}

// 添加月份背景色差异化显示（v1.x 版本）
function addMonthBackgrounds() {
  if (!ganttRef.value) return

  const ganttContainer = ganttRef.value.querySelector('.gantt-container')
  if (!ganttContainer) return

  const svg = ganttContainer.querySelector('svg.gantt')
  if (!svg) return

  // v1.x: grid layer 是 SVG group
  const gridLayer = svg.querySelector('.grid')
  if (!gridLayer) return

  // v1.x: 日期文字在 HTML header 中 (.lower-text)
  const lowerTexts = ganttContainer.querySelectorAll('.lower-text')

  // 表头高度
  const config = (ganttInstance.value as any).config
  const headerHeight = config?.header_height || 60
  const svgHeight = svg.getBoundingClientRect().height
  const gridHeight = Math.max(100, svgHeight - headerHeight) // 防止负值

  // 月份背景颜色
  const monthColors = [
    'rgba(255, 245, 238, 0.4)',
    'rgba(240, 248, 255, 0.4)',
    'rgba(245, 255, 250, 0.4)',
    'rgba(255, 250, 240, 0.4)',
    'rgba(248, 240, 255, 0.4)',
    'rgba(255, 255, 245, 0.4)',
  ]

  // 分析刻度位置和月份边界，用于绘制月份背景色
  // v1.x: lower-text class 包含日期信息，如 "date_2026-06-01"
  const monthRanges: { startX: number; endX: number; colorIndex: number }[] = []
  let lastMonthIndex = -1
  let monthStartX = 0
  let colorIndex = 0

  lowerTexts.forEach((textEl) => {
    const text = textEl as HTMLElement
    const leftStyle = text.style.left || '0'
    const x = parseFloat(leftStyle)

    // 从 class 中解析日期，格式: "date_YYYY-MM-DD"
    let dateStr = ''
    for (const cls of text.classList) {
      if (cls.startsWith('date_')) {
        dateStr = cls.replace('date_', '')
        break
      }
    }

    if (!dateStr) return

    const dateParts = dateStr.split('-')
    if (dateParts.length !== 3) return

    const month = parseInt(dateParts[1], 10) // 1-12
    const monthIndex = month - 1 // 0-11

    // 检测月份变化
    if (monthIndex !== lastMonthIndex) {
      // 结束上一个月份范围
      if (lastMonthIndex >= 0) {
        monthRanges.push({
          startX: monthStartX,
          endX: x,
          colorIndex: colorIndex
        })
        colorIndex++
      }
      lastMonthIndex = monthIndex
      monthStartX = x
    }
  })

  // 最后一个月份范围
  if (lastMonthIndex >= 0 && monthStartX > 0) {
    const lastLowerText = lowerTexts[lowerTexts.length - 1] as HTMLElement
    const lastX = parseFloat(lastLowerText.style.left || '0')
    monthRanges.push({
      startX: monthStartX,
      endX: lastX + (config?.column_width || 20),
      colorIndex: colorIndex
    })
  }

  // 绘制月份背景矩形
  monthRanges.forEach((range) => {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('x', range.startX.toString())
    rect.setAttribute('y', headerHeight.toString())
    rect.setAttribute('width', (range.endX - range.startX).toString())
    rect.setAttribute('height', gridHeight.toString())
    rect.setAttribute('fill', monthColors[range.colorIndex % monthColors.length])
    rect.setAttribute('class', 'month-background')
    gridLayer.insertBefore(rect, gridLayer.firstChild)
  })

  // v1.x 原生已支持中文月份显示（通过 upper_text），无需修改 lower-text
}

// 滚动到当前日期位置
function scrollToToday() {
  if (!ganttRef.value || !ganttInstance.value) return

  const container = ganttRef.value.querySelector('.gantt-container') as HTMLElement
  if (!container) return

  const config = (ganttInstance.value as any).config
  const ganttStart = (ganttInstance.value as any).gantt_start

  if (!ganttStart || !config) return

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const diffHours = (today.getTime() - ganttStart.getTime()) / (1000 * 60 * 60)
  const todayX = (diffHours / config.step) * config.column_width

  const scrollX = todayX - container.clientWidth * 0.25
  container.scrollLeft = Math.max(0, scrollX)
}

// 处理任务块点击
async function handleTaskClick(task: LocalGanttTask) {
  const mappingId = ganttTasks.value.find(t => t.id === task.id)?._mappingId
  if (!mappingId) return

  const mapping = await store.getById(mappingId)
  if (mapping) {
    emit('taskClick', mapping)
  }
}

// 监听数据变化，重新渲染甘特图
watch(ganttTasks, () => {
  initGantt()
}, { deep: true })

// 绑定 tooltip 事件
function bindTooltipEvents() {
  if (!ganttRef.value) return

  const svg = ganttRef.value.querySelector('svg.gantt')
  if (!svg) return

  const barWrappers = svg.querySelectorAll('.bar-wrapper')

  barWrappers.forEach(barWrapper => {
    barWrapper.addEventListener('mouseenter', handleBarMouseEnter as EventListener)
    barWrapper.addEventListener('mousemove', handleBarMouseMove as EventListener)
    barWrapper.addEventListener('mouseleave', handleBarMouseLeave as EventListener)
  })
}

// 处理 bar mouseenter
function handleBarMouseEnter(e: MouseEvent) {
  const target = e.currentTarget as SVGElement

  // 获取任务 ID (v1.x: data-id 在 bar-wrapper 上)
  const taskId = target.getAttribute('data-id')
  if (!taskId || taskId === '__anchor__') return

  const task = ganttTasks.value.find(t => t.id === taskId)
  if (!task) return

  const mappingId = task._mappingId
  const mapping = mappings.value.find(m => m.id === mappingId)
  if (!mapping) return

  const startDate = formatTimestamp(mapping.st, 'YYYY-MM-DD HH:mm:ss')
  const endDate = mapping.et ? formatTimestamp(mapping.et, 'YYYY-MM-DD HH:mm:ss') : '持续进行'
  const createTime = formatTimestamp(mapping.ct, 'YYYY-MM-DD HH:mm:ss')
  const taskType = mapping.type === 1 ? '活动期' : '暂停期'
  const targetServer = mapping.v ? `${mapping.v}服` : '无'
  const remark = mapping.cmt || '无'

  const daysCount = mapping.et
    ? Math.round((mapping.et - mapping.st) / (24 * 60 * 60 * 1000))
    : null
  const daysText = daysCount ? `共计: ${daysCount}天` : '共计: 无限'

  tooltipData.value = {
    title: `${mapping.k}服 (ID:${mapping.id})`,
    content: `指向: ${targetServer}\n类型: ${taskType}\n${daysText}\n时间: ${startDate} ~ ${endDate}\n备注: ${remark}\n创建时间: ${createTime}`
  }
  tooltipVisible.value = true
}

// 处理 bar mousemove
function handleBarMouseMove(e: MouseEvent) {
  if (!containerRef.value) return

  const containerRect = containerRef.value.getBoundingClientRect()
  tooltipX.value = e.clientX - containerRect.left + 15
  tooltipY.value = e.clientY - containerRect.top + 15
}

// 处理 bar mouseleave
function handleBarMouseLeave() {
  tooltipVisible.value = false
}

// 组件挂载
onMounted(() => {
  store.loadAll()
})

// 组件卸载
onUnmounted(() => {
  ganttInstance.value = null
})

// 导出刷新方法
defineExpose({
  refresh: initGantt
})
</script>

<style scoped>
.gantt-chart-container {
  flex: 1;
  overflow: auto;
  background: white;
  position: relative;
  min-height: 400px;
  display: flex;
  flex-direction: column;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  z-index: 10;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.gantt-wrapper {
  padding: 0;
  min-height: 400px;
  flex: 1;
}

.custom-tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  z-index: 100;
  pointer-events: none;
  white-space: pre-line;
  max-width: 320px;
}

.tooltip-title {
  font-weight: 600;
  margin-bottom: 4px;
  font-size: 13px;
}

.tooltip-content {
  font-size: 11px;
  opacity: 0.9;
}
</style>