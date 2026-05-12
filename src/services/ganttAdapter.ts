import { ServerMapping, GanttTask, DataType } from '@/types'
import { timestampToISO } from '@/utils/timeUtils'

type ViewMode = 'Day' | 'Week' | 'Month' | 'Quarter Day' | 'Half Day'

interface GanttOptions {
  header_height?: number
  column_width?: number
  step?: number
  view_modes?: readonly ViewMode[]
  bar_height?: number
  bar_corner_radius?: number
  arrow_curve?: number
  padding?: number
  view_mode?: ViewMode
  date_format?: string
  popup_trigger?: string | null
  custom_popup_html?: string | null
  language?: string
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
 * 构建被指向关系映射
 * 返回：Map<目标任务块ID, 源任务块ID列表>
 * 用于设置依赖关系，使箭头从源指向目标
 * 支持多个源指向同一目标（多个箭头）
 */
function buildIncomingMappings(mappings: ServerMapping[]): Map<string, string[]> {
  const incomingMap = new Map<string, string[]>()

  // 先构建目标服务器的任务块索引（按时间段）
  // Map<目标服务器, Map<时间段key, 任务块ID>>
  const targetServerTasks = new Map<number, Map<string, string>>()
  for (const item of mappings) {
    const isOngoing = item.et === null || item.et === undefined
    const taskKey = `${item.st}_${isOngoing ? 'ongoing' : item.et}`
    const taskId = `${item.k}_${taskKey}`

    if (!targetServerTasks.has(item.k)) {
      targetServerTasks.set(item.k, new Map())
    }
    targetServerTasks.get(item.k)!.set(taskKey, taskId)
  }

  // 对于每个映射任务，找到目标服务器在相同时间段的任务块
  for (const item of mappings) {
    if (item.type === DataType.MAPPING && item.v !== null && item.v !== item.k) {
      // 源任务块 ID
      const isOngoing = item.et === null || item.et === undefined
      const sourceTaskKey = `${item.st}_${isOngoing ? 'ongoing' : item.et}`
      const sourceTaskId = `${item.k}_${sourceTaskKey}`

      // 在目标服务器上找到相同时间段的任务块
      const targetServerTaskMap = targetServerTasks.get(item.v)
      if (targetServerTaskMap) {
        const targetTaskId = targetServerTaskMap.get(sourceTaskKey)
        if (targetTaskId) {
          // 收集多个源指向同一目标
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

  for (const [serverId, items] of grouped) {
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

      // 处理结束时间（持续任务延伸显示）
      // 左闭右开区间 [st, et)：et 那一天不应显示，所以减去 1 小时
      // 例如 et=2026-05-26 00:00:00，显示结束为 2026-05-25 23:00:00，甘特图只渲染到 25 号
      // 持续任务（et=null/undefined）延伸到甘特图最右侧（使用 ganttEnd）
      const visualGapMs = 1 * 60 * 60 * 1000 // 1 小时
      const displayEnd = isOngoing
        ? ganttEnd
        : item.et! - visualGapMs // et 不为 null/undefined，安全使用

      const task: GanttTask = {
        id: taskId,
        name: `${serverId}服`,
        start: timestampToISO(item.st),
        end: timestampToISO(displayEnd),
        progress: 0,
        dependencies,
        custom_class: item.type === DataType.MAPPING ? 'task-mapping' : 'task-paused',
        _serverId: serverId,
        _mappingId: item.id
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
 * 获取甘特图视图配置
 */
export function getGanttOptions(): GanttOptions {
  return {
    header_height: 50,
    column_width: 20,
    step: 24,
    view_modes: ['Day', 'Week', 'Month'] as const,
    bar_height: 22,
    bar_corner_radius: 6,
    arrow_curve: 5,
    padding: 14,
    view_mode: 'Day', // 每天一个刻度
    date_format: 'YYYY-MM-DD',
    popup_trigger: null, // 禁用默认 popup，使用自定义 tooltip
    custom_popup_html: null,
    language: 'zh'
  }
}