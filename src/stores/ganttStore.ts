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
    getById
  }
})