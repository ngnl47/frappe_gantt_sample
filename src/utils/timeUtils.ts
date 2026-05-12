import dayjs from 'dayjs'

/**
 * 将日期转换为当天 0 点的时间戳（毫秒）
 */
export function dateToZeroTimestamp(date: Date | string | number): number {
  return dayjs(date).startOf('day').valueOf()
}

/**
 * 时间戳转换为 ISO 格式字符串（本地时间，不带时区偏移）
 * Frappe Gantt 解析时会按本地时间处理
 */
export function timestampToISO(timestamp: number): string {
  return dayjs(timestamp).format('YYYY-MM-DDTHH:mm:ss')
}

/**
 * 时间戳转换为格式化日期字符串
 */
export function formatTimestamp(timestamp: number, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
  return dayjs(timestamp).format(format)
}

/**
 * 获取当前时间（当天 0 点）
 */
export function getTodayZero(): number {
  return dayjs().startOf('day').valueOf()
}

/**
 * 校验时间戳是否为当天 0 点
 */
export function isZeroTimestamp(timestamp: number): boolean {
  return dayjs(timestamp).startOf('day').valueOf() === timestamp
}

/**
 * 计算两个时间戳之间的天数
 */
export function daysBetween(start: number, end: number): number {
  return dayjs(end).diff(dayjs(start), 'day')
}

/**
 * 获取延伸显示的结束时间（持续任务用）
 */
export function getExtendedEndTime(days: number = 30): number {
  return dayjs().add(days, 'day').startOf('day').valueOf()
}

/**
 * 判断时间段 [st, et) 与 [t1, t2) 是否有交集
 * 左闭右开区间：任务块从 st 当天开始，在 et 当天结束（不包含 et 当天）
 * et 为 null 表示持续进行
 */
export function hasTimeIntersection(
  st: number,
  et: number | null,
  t1: number,
  t2: number
): boolean {
  // et 为 null（持续）：只要 st < t2 就有交集
  if (et === null) {
    return st < t2
  }
  // 有结束时间：st < t2 && et > t1（左闭右开交集条件）
  return st < t2 && et > t1
}