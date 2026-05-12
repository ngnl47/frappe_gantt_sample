import { ServerMapping, DataType } from '@/types'
import { hasTimeIntersection } from '@/utils/timeUtils'
import {
  addMapping,
  updateMapping,
  deleteMapping,
  getMappingById,
  getAllMappings,
  getMappingsByIndex,
  clearAllMappings,
  bulkAddMappings
} from './database'
import { getPresetData } from '@/data/presetData'

// 常量：14 天的毫秒数
const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000 // 1209600000

/**
 * 获取指定服务器未结束的任务块（et === null）
 */
export async function getUnfinishedTask(serverId: number): Promise<ServerMapping | null> {
  const all = await getAllMappings()
  return all.find(item => item.k === serverId && item.et === null) || null
}

/**
 * 校验时间段是否与已有记录重叠
 * 左闭右开区间 [st, et)
 */
export async function checkOverlap(
  serverId: number,
  st: number,
  et: number | null,
  excludeId?: number
): Promise<boolean> {
  const serverMappings = await getMappingsByIndex('by_k', serverId)

  for (const item of serverMappings) {
    // 排除自身（用于编辑场景）
    if (excludeId && item.id === excludeId) continue

    // 校验是否有交集（左闭右开）
    if (hasTimeIntersection(item.st, item.et, st, et ?? Infinity)) {
      return true // 有重叠
    }
  }

  return false // 无重叠
}

/**
 * 创建新记录（自动补充前一个任务的 et）
 * 规则：type=1（映射）的任务块，如果设置了 et，则跨度必须为 14 天
 */
export async function createMapping(
  data: Partial<ServerMapping>
): Promise<ServerMapping> {
  // 必填字段校验
  if (data.k === undefined || data.st === undefined || data.type === undefined) {
    throw new Error('缺少必填字段：k, st, type')
  }

  // 映射任务（type=1）如果设置了结束时间，跨度必须为 14 天或 14 天的倍数
  if (data.type === DataType.MAPPING && data.et !== null && data.et !== undefined) {
    const duration = data.et - data.st
    if (duration % FOURTEEN_DAYS !== 0) {
      throw new Error(`映射任务时间跨度必须为 14 天或 14 天的倍数，当前为 ${duration / (24 * 60 * 60 * 1000)} 天`)
    }
  }

  // 检查是否有未结束的任务块
  const unfinished = await getUnfinishedTask(data.k)

  // 如果有，设置其 et 为新任务块的 st（自动闭合）
  if (unfinished && data.st > unfinished.st) {
    await updateMapping({
      ...unfinished,
      et: data.st
    })
  }

  // 创建新记录
  const newMapping: Omit<ServerMapping, 'id'> = {
    k: data.k,
    v: data.v ?? null,
    cmt: data.cmt ?? '',
    ct: Date.now(),
    st: data.st,
    et: data.et ?? null,
    type: data.type
  }

  return addMapping(newMapping)
}

/**
 * 更新记录（允许修改 st 和 et）
 * 规则：
 * - type=1（映射）的 et 必须为 null（持续）或 st + 14天
 * - type=2（暂停）的 et 可以任意设置或 null
 * - et 必须大于 st
 * - st/et 变化后检查时间重叠
 */
export async function updateMappingData(
  id: number,
  data: Partial<ServerMapping>
): Promise<ServerMapping> {
  const existing = await getMappingById(id)
  if (!existing) {
    throw new Error('记录不存在')
  }

  // 处理时间变化
  const newSt = data.st !== undefined ? data.st : existing.st
  let newEt = data.et !== undefined ? data.et : existing.et

  // type=1（映射）校验：et 必须是 null 或 st + 14天*n（n为正整数）
  const newType = data.type ?? existing.type
  if (newType === DataType.MAPPING && newEt !== null) {
    const duration = newEt - newSt
    if (duration % FOURTEEN_DAYS !== 0 || duration <= 0) {
      throw new Error(`映射任务的结束时间必须为开始时间 + 14天*n（当前跨度 ${duration / (24 * 60 * 60 * 1000)} 天不是 14 天的倍数）`)
    }
  }

  // et 必须大于 st
  if (newEt !== null && newEt <= newSt) {
    throw new Error('结束时间必须大于开始时间')
  }

  // 检查时间重叠（排除自身）
  if (newSt !== existing.st || newEt !== existing.et) {
    const hasOverlap = await checkOverlap(existing.k, newSt, newEt, id)
    if (hasOverlap) {
      throw new Error('时间范围与已有记录重叠')
    }
  }

  const updated: ServerMapping = {
    ...existing,
    st: newSt,
    et: newEt,
    v: data.v ?? existing.v,
    cmt: data.cmt ?? existing.cmt,
    type: newType
  }

  return updateMapping(updated)
}

/**
 * 删除记录
 */
export async function deleteMappingData(id: number): Promise<void> {
  const existing = await getMappingById(id)
  if (!existing) return

  await deleteMapping(id)
}

/**
 * 批量查询：时间范围交集（左闭右开区间）
 */
export async function queryByTimeRange(
  t1: number,
  t2: number
): Promise<ServerMapping[]> {
  const all = await getAllMappings()
  return all.filter(item => hasTimeIntersection(item.st, item.et, t1, t2))
}

/**
 * 查询指定服务器的所有记录
 */
export async function queryByServer(serverId: number): Promise<ServerMapping[]> {
  return getMappingsByIndex('by_k', serverId)
}

/**
 * 初始化预设数据
 */
export async function initPresetData(): Promise<void> {
  await clearAllMappings()
  await bulkAddMappings(getPresetData())
}

/**
 * 导出数据服务接口
 */
export const dataService = {
  create: createMapping,
  update: updateMappingData,
  delete: deleteMappingData,
  getById: getMappingById,
  getAll: getAllMappings,
  queryByTimeRange,
  queryByServer,
  getUnfinishedTask,
  checkOverlap,
  initPresetData,
  clearAll: clearAllMappings
}