// 数据类型枚举
export enum DataType {
  MAPPING = 1,    // 服务器映射指向关系
  PAUSED = 2      // 服务器暂停期，无指向
}

// 服务器映射记录（左闭右开时间区间 [st, et)）
export interface ServerMapping {
  id: number;         // 记录唯一 ID，全局自增
  k: number;          // 源服务器 ID
  v: number | null;   // 目标服务器 ID，null 表示无指向或暂停期
  cmt: string;        // 备注
  ct: number;         // 创建时间（毫秒时间戳）
  st: number;         // 开始时间（毫秒时间戳，必须为当天 0 点）
  et: number | null;  // 结束时间（毫秒时间戳；null 表示持续进行中）
  type: DataType;     // 数据类型：1=映射，2=暂停
}

// 甘特图任务块（Frappe Gantt 格式）
export interface GanttTask {
  id: string;           // 任务块 ID，格式：`${k}_${st}_${et ?? 'ongoing'}`
  name: string;         // 显示名称，格式：服务器 ID
  start: string;        // 开始时间，ISO 格式
  end: string;          // 结束时间，ISO 格式（持续任务延伸显示）
  progress: number;     // 进度百分比，默认 0
  dependencies: string; // 依赖的任务块 ID
  custom_class?: string; // 自定义 CSS 类：task-mapping/task-paused（v1.x 只支持单个类名）
  _serverId: number;    // 服务器 ID（扩展字段）
  _mappingId: number;   // 业务数据 ID（扩展字段）
  _extendsLeft?: boolean; // 是否从左侧延伸（扩展字段，用于添加额外类名）
}

// 时间范围筛选参数
export interface TimeRangeFilter {
  start: number;
  end: number;
}

// 弹窗模式
export enum ModalMode {
  VIEW = 'view',    // 详情查看
  EDIT = 'edit',    // 编辑
  CREATE = 'create' // 新增
}