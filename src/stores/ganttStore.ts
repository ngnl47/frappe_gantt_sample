import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ServerMapping, GanttTask, TimeRangeFilter } from '@/types'
import { dataService } from '@/services/dataService'
import { toGanttTasks } from '@/services/ganttAdapter'
import { serverIds as presetServerIds } from '@/data/presetData'

export const useGanttStore = defineStore('gantt', () => {
  // 状态
  const mappings = ref<ServerMapping[]>([])
  const loading = ref(false)
  const timeRangeFilter = ref<TimeRangeFilter | null>(null)
  const selectedTask = ref<ServerMapping | null>(null)

  // 计算属性：甘特图任务块
  const ganttTasks = computed<GanttTask[]>(() => {
    const filtered = filteredMappings.value
    const filterStart = timeRangeFilter.value?.start ?? null
    const filterEnd = timeRangeFilter.value?.end ?? null
    return toGanttTasks(filtered, filterStart, filterEnd)
  })

  // 计算属性：服务器 ID 列表（从数据中提取，合并预设）
  const serverIds = computed<number[]>(() => {
    const ids = new Set<number>(presetServerIds)
    for (const item of mappings.value) {
      ids.add(item.k)
      if (item.v !== null) ids.add(item.v)
    }
    return Array.from(ids).sort()
  })

  // 计算属性：筛选后的数据
  const filteredMappings = computed<ServerMapping[]>(() => {
    if (!timeRangeFilter.value) return mappings.value

    const { start, end } = timeRangeFilter.value
    return mappings.value.filter(item => {
      // 左闭右开交集条件
      if (item.et === null) {
        return item.st < end
      }
      return item.st < end && item.et > start
    })
  })

  // Actions

  /**
   * 加载所有数据
   */
  async function loadAll() {
    loading.value = true
    try {
      mappings.value = await dataService.getAll()
    } finally {
      loading.value = false
    }
  }

  /**
   * 初始化预设数据
   */
  async function initPreset() {
    loading.value = true
    try {
      await dataService.initPresetData()
      await loadAll()
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建新记录
   */
  async function create(data: Partial<ServerMapping>) {
    loading.value = true
    try {
      const result = await dataService.create(data)
      await loadAll()
      return result
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新记录
   */
  async function update(id: number, data: Partial<ServerMapping>) {
    loading.value = true
    try {
      const result = await dataService.update(id, data)
      await loadAll()
      return result
    } finally {
      loading.value = false
    }
  }

  /**
   * 删除记录
   */
  async function deleteMapping(id: number) {
    loading.value = true
    try {
      await dataService.delete(id)
      await loadAll()
    } finally {
      loading.value = false
    }
  }

  /**
   * 设置时间范围筛选
   */
  function setTimeRangeFilter(filter: TimeRangeFilter | null) {
    timeRangeFilter.value = filter
  }

  /**
   * 选择任务（用于弹窗显示）
   */
  function selectTask(mapping: ServerMapping | null) {
    selectedTask.value = mapping
  }

  /**
   * 根据 ID 获取记录
   */
  async function getById(id: number): Promise<ServerMapping | null> {
    return dataService.getById(id)
  }

  /**
   * 检查时间重叠
   * @param k 服务器 ID
   * @param st 开始时间戳
   * @param et 结束时间戳（null 表示持续）
   * @param excludeId 排除的记录 ID（编辑时排除自身）
   * @returns 重叠的记录列表，如果没有重叠返回空数组
   */
  function checkTimeOverlap(k: number, st: number, et: number | null, excludeId?: number): ServerMapping[] {
    const overlaps: ServerMapping[] = []

    for (const item of mappings.value) {
      // 排除不同服务器
      if (item.k !== k) continue
      // 排除自身（编辑模式）
      if (excludeId && item.id === excludeId) continue

      // 检查时间重叠
      // 左闭右开区间 [st, et)，重叠条件：两区间有交集
      // 重叠：stA < etB && stB < etA
      // 持续任务 et 为 null，表示无限延伸

      const itemSt = item.st
      const itemEt = item.et

      if (et === null) {
        // 新任务是持续任务
        // 只要现有任务的开始时间 >= 新任务开始时间，就重叠
        // 因为新任务从 st 开始无限延伸
        if (itemSt >= st) {
          overlaps.push(item)
        }
        // 或者现有任务也是持续任务，且开始时间 < 新任务开始时间
        // 这时新任务在现有持续任务期间开始，也算重叠
        if (itemEt === null && itemSt < st) {
          overlaps.push(item)
        }
      } else if (itemEt === null) {
        // 现有任务是持续任务
        // 只要新任务的开始时间 >= 现有任务开始时间，就重叠
        if (st >= itemSt) {
          overlaps.push(item)
        }
      } else {
        // 两个任务都有结束时间
        // 重叠条件：st < itemEt && itemSt < et
        if (st < itemEt && itemSt < et) {
          overlaps.push(item)
        }
      }
    }

    return overlaps
  }

  return {
    // 状态
    mappings,
    loading,
    timeRangeFilter,
    selectedTask,
    // 计算属性
    ganttTasks,
    serverIds,
    filteredMappings,
    // Actions
    loadAll,
    initPreset,
    create,
    update,
    deleteMapping,
    setTimeRangeFilter,
    selectTask,
    getById,
    checkTimeOverlap
  }
})