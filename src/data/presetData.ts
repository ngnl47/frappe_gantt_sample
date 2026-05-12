import { ServerMapping, DataType } from '@/types'
import { getTodayZero } from '@/utils/timeUtils'

// 时间基准：当前日期
// 映射任务跨度 = 14 天

const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000  // 14 天

export function getPresetData(): Omit<ServerMapping, 'id'>[] {
  const BASE_TIME = getTodayZero() // 当前日期 00:00

  return [
    // 服务器1：第1个14天映射到服务器2，第2个14天暂停
    {
      k: 1,
      v: 2,
      cmt: '服务器1→服务器2',
      ct: Date.now(),
      st: BASE_TIME,
      et: BASE_TIME + FOURTEEN_DAYS,
      type: DataType.MAPPING
    },
    {
      k: 1,
      v: null,
      cmt: '服务器1暂停期',
      ct: Date.now(),
      st: BASE_TIME + FOURTEEN_DAYS,
      et: BASE_TIME + FOURTEEN_DAYS * 2,
      type: DataType.PAUSED
    },

    // 服务器2：第1个14天被服务器1指向，第2个14天映射到服务器3
    {
      k: 2,
      v: null,
      cmt: '服务器2被指向',
      ct: Date.now(),
      st: BASE_TIME,
      et: BASE_TIME + FOURTEEN_DAYS,
      type: DataType.MAPPING
    },
    {
      k: 2,
      v: 3,
      cmt: '服务器2→服务器3',
      ct: Date.now(),
      st: BASE_TIME + FOURTEEN_DAYS,
      et: BASE_TIME + FOURTEEN_DAYS * 2,
      type: DataType.MAPPING
    },

    // 服务器3：14天暂停后持续
    {
      k: 3,
      v: null,
      cmt: '服务器3暂停',
      ct: Date.now(),
      st: BASE_TIME,
      et: BASE_TIME + FOURTEEN_DAYS,
      type: DataType.PAUSED
    },
    {
      k: 3,
      v: null,
      cmt: '服务器3持续暂停',
      ct: Date.now(),
      st: BASE_TIME + FOURTEEN_DAYS,
      et: null, // 暂停期可持续进行
      type: DataType.PAUSED
    },

    // 服务器4：独立运行（k=v），14天周期
    {
      k: 4,
      v: 4,
      cmt: '服务器4独立',
      ct: Date.now(),
      st: BASE_TIME,
      et: BASE_TIME + FOURTEEN_DAYS,
      type: DataType.MAPPING
    },
    {
      k: 4,
      v: 4,
      cmt: '服务器4持续独立',
      ct: Date.now(),
      st: BASE_TIME + FOURTEEN_DAYS,
      et: BASE_TIME + FOURTEEN_DAYS * 2,
      type: DataType.MAPPING
    }
  ]
}

// 导出服务器 ID 列表（用于下拉选择）
export const serverIds = [1, 2, 3, 4]