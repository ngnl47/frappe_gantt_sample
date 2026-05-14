import { ServerMapping, GanttTask, DataType } from '@/types'
import { timestampToISO } from '@/utils/timeUtils'

type ViewMode = 'Day' | 'Week' | 'Month' | 'Quarter Day' | 'Half Day' | 'Year'

// v1.x Popup context type (simplified for adapter)
interface PopupContext {
  task: any
  chart: any
  set_title: (html: string) => void
  set_subtitle: (html: string) => void
  set_details: (html: string) => void
  add_action: (label: string, callback: (task: any, gantt: any) => void) => void
  hide: () => void
}

interface GanttOptions {
  // Dimensions (v1.x: header_height split)
  upper_header_height?: number
  lower_header_height?: number
  column_width?: number
  step?: number
  view_modes?: ViewMode[]
  bar_height?: number
  bar_corner_radius?: number
  arrow_curve?: number
  padding?: number
  view_mode?: ViewMode
  date_format?: string
  language?: string
  // Access control (NEW)
  readonly?: boolean
  readonly_dates?: boolean
  readonly_progress?: boolean
  // Visual (NEW)
  lines?: 'none' | 'vertical' | 'horizontal' | 'both'
  today_button?: boolean
  view_mode_select?: boolean
  // Behavior (NEW)
  infinite_padding?: boolean
  scroll_to?: 'today' | 'start' | 'end' | string | null
  // Popup (RESTRUCTURED)
  popup_on?: 'click' | 'hover'
  popup?: (ctx: PopupContext) => string | boolean | void
}

/**
 * 按服务器 ID 分组
 */
function groupByServer(mappings: ServerMapping[]): Map<number, ServerMapping[]> {
  const grouped = new Map<number, ServerMapping[]>()

  for (const item of mappings) {
    const existing = grouped.get(item.k) || []
    existing.push(item)
    grouped.set(item.k, existing)
  }

  return grouped
}

/**
 * 构建依赖关系映射
 * 同一时间段（st, et 相同）的任务块为一组，组内 k 指向 v
 * 返回：Map<目标任务块ID, 源任务块ID列表>
 * 箭头从源(k)指向目标(v)
 */
function buildIncomingMappings(mappings: ServerMapping[]): Map<string, string[]> {
  const incomingMap = new Map<string, string[]>()

  // 按时间段分组任务块
  // Map<时间段key, Map<服务器ID, 任务块ID>>
  const timeGroupTasks = new Map<string, Map<number, string>>()
  for (const item of mappings) {
    const isOngoing = item.et === null || item.et === undefined
    const taskKey = `${item.st}_${isOngoing ? 'ongoing' : item.et}`
    const taskId = `${item.k}_${taskKey}`

    if (!timeGroupTasks.has(taskKey)) {
      timeGroupTasks.set(taskKey, new Map())
    }
    timeGroupTasks.get(taskKey)!.set(item.k, taskId)
  }

  // 对于每个 mapping，在同一时间段内建立 k → v 的指向关系
  for (const item of mappings) {
    // 只有 type=1 (映射) 且 v 不为空 且 v != k 才有指向
    if (item.type === DataType.MAPPING && item.v !== null && item.v !== item.k) {
      const isOngoing = item.et === null || item.et === undefined
      const taskKey = `${item.st}_${isOngoing ? 'ongoing' : item.et}`

      // 源任务块（k 服务器）
      const sourceTaskId = `${item.k}_${taskKey}`

      // 目标任务块（v 服务器，同一时间段）
      const targetServerTasks = timeGroupTasks.get(taskKey)
      if (targetServerTasks) {
        const targetTaskId = targetServerTasks.get(item.v)
        if (targetTaskId) {
          // 箭头从源指向目标
          const existing = incomingMap.get(targetTaskId) || []
          existing.push(sourceTaskId)
          incomingMap.set(targetTaskId, existing)
        }
      }
    }
  }

  return incomingMap
}

/**
 * 将业务数据转换为甘特图任务块
 * @param mappings 业务数据列表
 * @param filterStart 筛选时间范围的开始时间（可选）
 * @param filterEnd 筛选时间范围的结束时间（可选）
 */
export function toGanttTasks(
  mappings: ServerMapping[],
  filterStart?: number | null,
  filterEnd?: number | null
): GanttTask[] {
  const grouped = groupByServer(mappings)
  const incomingMap = buildIncomingMappings(mappings)
  const tasks: GanttTask[] = []

  // 计算数据中的最小 st 和最大 et（持续任务视为有最大 et）
  const minDataSt = mappings.length > 0
    ? Math.min(...mappings.map(m => m.st))
    : null

  // 甘特图起始时间 = 筛选开始时间与数据最小 st 的较小值
  const ganttStart = filterStart && minDataSt
    ? Math.min(filterStart, minDataSt)
    : filterStart ?? minDataSt ?? Date.now()

  // 甘特图结束时间 = 筛选结束时间
  // 持续任务延伸到筛选结束时间
  // 默认：前一个月到后两个月
  const oneMonthMs = 30 * 24 * 60 * 60 * 1000
  const ganttEnd = filterEnd ?? Date.now() + 2 * oneMonthMs

  // 添加一个虚拟锚点任务（不可见），用于控制甘特图时间轴范围
  // 起始时间控制甘特图左侧，结束时间控制甘特图右侧（影响持续任务显示）
  const anchorTask: GanttTask = {
    id: '__anchor__',
    name: '',
    start: timestampToISO(ganttStart),
    end: timestampToISO(ganttEnd),
    progress: 0,
    dependencies: '',
    custom_class: 'task-anchor', // 透明样式
    _serverId: 0,
    _mappingId: 0
  }
  tasks.push(anchorTask)

  // 按 serverId (k) 递增排序遍历
  const sortedServerIds = Array.from(grouped.keys()).sort((a, b) => a - b)

  for (const serverId of sortedServerIds) {
    const items = grouped.get(serverId)!
    // 每个服务器一行，任务块按时间排序
    items.sort((a, b) => a.st - b.st)

    for (const item of items) {
      // 生成任务块 ID（et 为 null/undefined 时使用 'ongoing'）
      const isOngoing = item.et === null || item.et === undefined
      const taskId = `${serverId}_${item.st}_${isOngoing ? 'ongoing' : item.et}`

      // 处理依赖关系：箭头从源服务器指向目标服务器
      // 支持多个源指向同一目标（多个箭头，逗号分隔）
      let dependencies = ''
      const incomingSources = incomingMap.get(taskId)
      if (incomingSources && incomingSources.length > 0) {
        dependencies = incomingSources.join(',')
      }

      // 处理显示时间范围
      // 1. 如果 st 在筛选范围之前，显示起点调整为 filterStart（任务块左边界从筛选起点开始）
      // 2. 持续任务延伸到筛选结束时间 filterEnd
      // 3. 左闭右开区间 [st, et)：et 那一天不应显示，所以减去 1 小时
      const visualGapMs = 1 * 60 * 60 * 1000 // 1 小时

      // 显示起点：如果实际 st 在筛选范围之前，则从筛选起点开始显示
      const isStartBeforeFilter = filterStart && item.st < filterStart
      const displayStart = isStartBeforeFilter ? filterStart : item.st

      // 显示终点：持续任务延伸到筛选结束时间
      const displayEnd = isOngoing
        ? (filterEnd ?? ganttEnd)
        : item.et! - visualGapMs

      // 自定义类：v1.x 只支持单个类名
      // 基础类
      const customClass = item.type === DataType.MAPPING ? 'task-mapping' : 'task-paused'
      // 延伸标记通过 _extendsLeft 属性传递，后续在组件中添加类名

      const task: GanttTask = {
        id: taskId,
        name: `${serverId}服`,
        start: timestampToISO(displayStart),
        end: timestampToISO(displayEnd),
        progress: 0,
        dependencies,
        custom_class: customClass,
        _serverId: serverId,
        _mappingId: item.id,
        // 延伸标记：用于后续添加额外类名
        _extendsLeft: isStartBeforeFilter ? true : false
      }

      tasks.push(task)
    }
  }

  return tasks
}

/**
 * 从甘特图任务块 ID 解析业务数据信息
 */
export function parseTaskId(taskId: string): {
  serverId: number
  st: number
  et: number | null
} {
  const parts = taskId.split('_')
  const serverId = parseInt(parts[0], 10)
  const st = parseInt(parts[1], 10)
  const etPart = parts[2]

  return {
    serverId,
    st,
    et: etPart === 'ongoing' ? null : parseInt(etPart, 10)
  }
}

/**
 * 获取甘特图视图配置 (v1.x)
 */
export function getGanttOptions(): GanttOptions {
  // 自定义 Day 视图模式，禁用默认 padding
  const customDayViewMode = {
    name: 'Day',
    padding: ['0d', '0d'], // 无 padding，精确控制时间范围
    step: '1d',
    date_format: 'YYYY-MM-DD',
    column_width: 20,
    lower_text: (d: Date, ld: Date | null) => {
      if (!ld || d.getDate() !== ld.getDate()) {
        return d.getDate().toString()
      }
      return ''
    },
    upper_text: (d: Date, ld: Date | null) => {
      if (!ld || d.getMonth() !== ld.getMonth()) {
        const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
        return monthNames[d.getMonth()]
      }
      return ''
    },
    thick_line: (d: Date) => d.getDate() === 1, // 月份第一天显示粗线（月份间隔）
  }

  return {
    // Dimensions - header_height 拆分为 upper/lower
    upper_header_height: 30,
    lower_header_height: 20,
    column_width: 20,
    bar_height: 15,
    bar_corner_radius: 5,
    arrow_curve: 5,
    padding: 9,
    view_mode: customDayViewMode as any,
    view_modes: [customDayViewMode as any, 'Week', 'Month'],
    date_format: 'YYYY-MM-DD',
    language: 'zh',

    // Access control - 禁止编辑
    readonly: true,
    readonly_dates: true,
    readonly_progress: true,

    // Visual - 显示垂直线（通过 CSS 只保留月份分隔线）+ 水平线（行分隔）
    lines: 'both',
    today_button: false,
    view_mode_select: false,

    // v1.x 关键配置：禁用自动 padding，精确控制时间范围
    infinite_padding: false,
    scroll_to: null,

    // Popup - 使用新 API 禁用
    popup_on: 'click',
    popup: () => false,
  }
}