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

    <div ref="ganttRef" class="gantt-wrapper" v-show="!loading && realTaskCount > 0"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { useGanttStore } from '@/stores/ganttStore'
import { ServerMapping } from '@/types'
import { getGanttOptions } from '@/services/ganttAdapter'
import Gantt from 'frappe-gantt'

interface FrappeGanttTask {
  id: string
  name: string
  start: string
  end: string
  progress?: number
  dependencies?: string
  custom_class?: string
  _serverId?: number
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

// 计算属性
const loading = computed(() => store.loading)
const ganttTasks = computed(() => store.ganttTasks)

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

  // 转换任务数据为 Frappe Gantt 格式（包含锚点任务和 _serverId）
  const tasks: FrappeGanttTask[] = ganttTasks.value.map(task => ({
    id: task.id,
    name: task.name,
    start: task.start,
    end: task.end,
    progress: task.progress,
    dependencies: task.dependencies,
    custom_class: task.custom_class,
    _serverId: task._serverId
  }))

  // 销毁旧实例
  ganttInstance.value = null
  ganttRef.value.innerHTML = ''

  // 创建新实例
  ganttInstance.value = new Gantt(ganttRef.value, tasks, {
    ...getGanttOptions(),
    on_click: (task: FrappeGanttTask) => {
      handleTaskClick(task)
    }
  })

  // 覆盖 Frappe Gantt 的 padding 行为，使时间轴精确显示筛选范围
  const filterStart = store.timeRangeFilter?.start
  const filterEnd = store.timeRangeFilter?.end

  if (filterStart && filterEnd && ganttInstance.value) {
    const gantt = ganttInstance.value as any

    // 覆盖 gantt_start/gantt_end（移除 padding）
    gantt.gantt_start = new Date(filterStart)
    gantt.gantt_end = new Date(filterEnd)

    // 重新生成 dates 数组（时间刻度）
    gantt.dates = []
    let curDate = new Date(filterStart)
    while (curDate < new Date(filterEnd)) {
      gantt.dates.push(new Date(curDate))
      curDate = new Date(curDate.getTime() + gantt.options.step * 60 * 60 * 1000)
    }

    // 清空 SVG 并重新渲染
    gantt.$svg.innerHTML = ''
    gantt.render()
  }

  // 渲染完成后调整同一服务器任务块的行位置 + 添加月份背景色
  await nextTick()
  adjustSameServerBarsToSameRow()
  addMonthBackgrounds()
  scrollToToday()
}

// 将同一服务器（k 值相同）的任务块调整到同一行
function adjustSameServerBarsToSameRow() {
  if (!ganttRef.value || !ganttInstance.value) return

  const svg = ganttRef.value.querySelector('svg.gantt')
  if (!svg) return

  // 从任务数据中提取服务器 ID，按服务器分配行号
  const serverToRowIndex: Map<number, number> = new Map()
  let rowIndex = 0

  // 首先收集所有服务器 ID（按首次出现顺序）
  ganttTasks.value.forEach(task => {
    if (task.id === '__anchor__') return // 跳过锚点
    const serverId = task._serverId
    if (!serverToRowIndex.has(serverId)) {
      serverToRowIndex.set(serverId, rowIndex)
      rowIndex++
    }
  })

  // 更新 Frappe Gantt 内部 task._index（关键！箭头依赖此值）
  const ganttTasksInternal = (ganttInstance.value as any).tasks
  if (ganttTasksInternal) {
    ganttTasksInternal.forEach((task: any) => {
      if (task.id === '__anchor__') return
      const serverId = parseInt(task.id.split('_')[0], 10)
      task._index = serverToRowIndex.get(serverId) ?? 0
    })
  }

  // 从 gantt options 获取实际配置值（保持与 Frappe Gantt 一致）
  const options = (ganttInstance.value as any).options
  const headerHeight = options.header_height || 50
  const barHeight = options.bar_height || 30
  const padding = options.padding || 12

  // 更新每个 bar 的 y 位置
  const bars = (ganttInstance.value as any).bars
  if (bars) {
    bars.forEach((bar: any) => {
      if (bar.task.id === '__anchor__') return
      const serverId = bar.task._serverId || parseInt(bar.task.id.split('_')[0], 10)
      const targetRowIndex = serverToRowIndex.get(serverId) ?? 0

      // 使用与 bar.compute_y() 一致的公式
      // y = header_height + padding + _index * (height + padding)
      const targetY = headerHeight + padding + targetRowIndex * (barHeight + padding)

      // 更新 bar 内部的 y 属性和 SVG 元素
      bar.y = targetY
      bar.$bar.setAttribute('y', targetY.toString())

      // 检查是否是持续任务（et=null），延伸到甘特图时间轴最右侧
      // 通过 task.id 解析：格式为 serverId_st_et，et 为 'ongoing' 表示持续任务
      const taskIdParts = bar.task.id.split('_')
      const isOngoing = taskIdParts[2] === 'ongoing'

      // 获取甘特图网格宽度（时间轴总宽度）
      const gridBackground = svg.querySelector('.grid-background')
      const gridWidth = gridBackground ? parseFloat(gridBackground.getAttribute('width') || '0') : 0

      if (isOngoing && gridWidth > 0) {
        const barX = bar.$bar.getX()
        const newWidth = gridWidth - barX + options.column_width // 多加一列确保延伸到底

        if (newWidth > 0) {
          bar.$bar.setAttribute('width', newWidth.toString())
          bar.width = newWidth

          // 更新 progress bar 宽度（按进度比例）
          if (bar.$bar_progress && bar.task.progress) {
            const progressWidth = newWidth * (bar.task.progress / 100)
            bar.$bar_progress.setAttribute('width', progressWidth.toString())
          }
        }
      }

      // 更新 progress bar 的 y（如果存在）
      if (bar.$bar_progress) {
        bar.$bar_progress.setAttribute('y', targetY.toString())
      }

      // 更新 bar-label 的 y 位置（标签在 bar 中间）
      const label = bar.group.querySelector('.bar-label')
      if (label) {
        label.setAttribute('y', (targetY + barHeight / 2).toString())
      }

      // 手动更新 handle_group 中所有元素的 y 位置
      // 注意：update_handle_position() 只更新 x，不更新 y！
      const handleGroup = bar.handle_group
      if (handleGroup) {
        const leftHandle = handleGroup.querySelector('.handle.left')
        const rightHandle = handleGroup.querySelector('.handle.right')
        const progressHandle = handleGroup.querySelector('.handle.progress')

        // handle 的 y = bar.y + 1，高度为 barHeight - 2
        const handleY = targetY + 1
        if (leftHandle) {
          leftHandle.setAttribute('y', handleY.toString())
        }
        if (rightHandle) {
          rightHandle.setAttribute('y', handleY.toString())
        }

        // progress handle 是 polygon，需要重新计算 points
        if (progressHandle && bar.$bar_progress) {
          const barProg = bar.$bar_progress
          const points = [
            barProg.getEndX() - 5, barProg.getY() + barProg.getHeight(),
            barProg.getEndX() + 5, barProg.getY() + barProg.getHeight(),
            barProg.getEndX(), barProg.getY() + barProg.getHeight() - 8.66
          ]
          progressHandle.setAttribute('points', points.join(','))
        }
      }
    })
  }

  // 更新所有箭头路径（箭头基于 task._index 计算 y）
  const arrows = (ganttInstance.value as any).arrows
  if (arrows) {
    arrows.forEach((arrow: any) => {
      arrow.update()
    })
  }

  // 调整 arrow layer 顺序，使其在 bar layer 之上（不被任务块遮挡）
  // Frappe Gantt 默认顺序：grid, date, arrow, progress, bar, details
  // 需要将 arrow 移到 bar 之后
  const arrowLayer = svg.querySelector('.arrow')
  const barLayer = svg.querySelector('.bar')
  if (arrowLayer && barLayer && arrowLayer.parentElement) {
    arrowLayer.parentElement.appendChild(arrowLayer)
  }
}

// 添加月份背景色差异化显示，并修改日期标签
function addMonthBackgrounds() {
  if (!ganttRef.value) return

  const svg = ganttRef.value.querySelector('svg.gantt')
  if (!svg) return

  // 查找 grid layer
  const gridLayer = svg.querySelector('.grid-layer')
  if (!gridLayer) return

  // 查找 dates layer（日期文字）
  const datesLayer = svg.querySelector('.dates-layer')
  if (!datesLayer) return

  // 获取所有刻度线位置和对应日期
  // const ticks = gridLayer.querySelectorAll('.tick') // 未使用

  // 从 SVG 数据中解析日期（Frappe Gantt 内部存储）
  // 简化方案：从日期文字推断位置
  const dateTexts = datesLayer.querySelectorAll('text')

  // 表头高度
  const headerHeight = 50
  const gridHeight = svg.getBoundingClientRect().height - headerHeight

  // 月份背景颜色
  const monthColors = [
    'rgba(255, 245, 238, 0.4)',
    'rgba(240, 248, 255, 0.4)',
    'rgba(245, 255, 250, 0.4)',
    'rgba(255, 250, 240, 0.4)',
    'rgba(248, 240, 255, 0.4)',
    'rgba(255, 255, 245, 0.4)',
  ]

  // 中文月份名
  const monthNamesZh = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

  // 分析刻度位置，找出月份边界
  const tickData: { x: number; date: number; isMonthStart: boolean }[] = []
  let currentMonth = -1
  let monthStartX = 0
  const monthRanges: { startX: number; endX: number; monthIndex: number }[] = []

  dateTexts.forEach((textEl) => {
    const text = textEl as SVGTextElement
    const content = text.textContent || ''
    const x = parseFloat(text.getAttribute('x') || '0')

    // 解析日期数字（Day 模式下显示的是日期数字）
    const dayNum = parseInt(content, 10)
    if (dayNum >= 1 && dayNum <= 31) {
      // 判断是否是月初（显示月份名）
      const isMonthStart = dayNum === 1

      // 检测月份变化（通过1号检测）
      if (isMonthStart) {
        // 上一个月份结束
        if (currentMonth >= 0) {
          monthRanges.push({
            startX: monthStartX,
            endX: x,
            monthIndex: currentMonth
          })
        }
        currentMonth = (currentMonth + 1) % 12
        monthStartX = x
      }

      tickData.push({ x, date: dayNum, isMonthStart })
    }
  })

  // 最后一个月份
  if (currentMonth >= 0 && monthStartX > 0) {
    const lastTickX = tickData.length > 0 ? tickData[tickData.length - 1].x : 0
    monthRanges.push({
      startX: monthStartX,
      endX: lastTickX + 20,
      monthIndex: currentMonth
    })
  }

  // 绘制月份背景矩形
  monthRanges.forEach((range, i) => {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('x', range.startX.toString())
    rect.setAttribute('y', headerHeight.toString())
    rect.setAttribute('width', (range.endX - range.startX).toString())
    rect.setAttribute('height', gridHeight.toString())
    rect.setAttribute('fill', monthColors[i % monthColors.length])
    rect.setAttribute('class', 'month-background')
    gridLayer.insertBefore(rect, gridLayer.firstChild)
  })

  // 修改日期文字显示：1号和15号显示月份名
  tickData.forEach((tick) => {
    // 找到对应位置的文字元素
    const matchingText = Array.from(dateTexts).find(textEl => {
      const x = parseFloat(textEl.getAttribute('x') || '0')
      return Math.abs(x - tick.x) < 5
    })

    if (matchingText) {
      const monthIndex = monthRanges.findIndex(r => tick.x >= r.startX && tick.x < r.endX)
      const monthName = monthIndex >= 0 ? monthNamesZh[monthRanges[monthIndex].monthIndex] : ''

      if (tick.date === 1) {
        // 1号显示月份名
        matchingText.textContent = monthName
        matchingText.setAttribute('font-weight', '600')
        matchingText.setAttribute('fill', '#1a1a1a')
      } else if (tick.date === 15) {
        // 15号显示月份名 + 15
        matchingText.textContent = `${monthName} 15`
        matchingText.setAttribute('font-weight', '500')
      }
    }
  })

  // 添加月初分隔线（更粗的刻度线）
  tickData.filter(t => t.date === 1).forEach((tick) => {
    // 在该位置添加粗线
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    line.setAttribute('d', `M ${tick.x} ${headerHeight} v ${gridHeight}`)
    line.setAttribute('stroke', '#333')
    line.setAttribute('stroke-width', '1')
    line.setAttribute('class', 'month-separator')
    gridLayer.appendChild(line)
  })
}

// 滚动到当前日期位置
function scrollToToday() {
  if (!ganttRef.value || !ganttInstance.value) return

  const container = ganttRef.value.querySelector('.gantt-container') as HTMLElement
  if (!container) return

  const options = (ganttInstance.value as any).options
  const ganttStart = (ganttInstance.value as any).gantt_start

  if (!ganttStart || !options) return

  // 计算当前日期相对于甘特图起始时间的偏移
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 计算今天对应的 x 位置
  const diffHours = (today.getTime() - ganttStart.getTime()) / (1000 * 60 * 60)
  const todayX = (diffHours / options.step) * options.column_width

  // 滚动到今天位置（居中显示）
  const scrollX = todayX - container.clientWidth / 2
  container.scrollLeft = Math.max(0, scrollX)
}

// 处理任务块点击
async function handleTaskClick(task: FrappeGanttTask) {
  // 从任务 ID 解析 mappingId
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

// 组件挂载
onMounted(() => {
  // 加载数据
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
  padding: 20px;
  min-height: 400px;
}
</style>