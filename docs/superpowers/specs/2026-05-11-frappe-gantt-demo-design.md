---
name: frappe-gantt-demo-design
description: 军团战合服战场管理甘特图 Demo 项目设计规格
type: project
---

# 军团战合服战场管理甘特图 Demo 设计规格

## 项目概述

创建一个 Demo 项目，演示军团战合服战场的管理功能。通过 Frappe Gantt 甘特图可视化展示服务器之间的指向关系和时间段编排。

**目标：**
- 验证 Frappe Gantt 展示服务器指向关系的可行性
- 提供可移植到 evo-manager 项目的技术方案

## 技术栈

与目标项目 evo-manager 保持一致：

| 类别 | 技术 |
|------|------|
| 框架 | Vue 3.3.4 + TypeScript |
| 构建工具 | Vite 3.2.5 |
| UI 组件库 | Element Plus 2.2.30 |
| 样式 | Tailwind CSS + Sass |
| 状态管理 | Pinia |
| 时间处理 | dayjs |
| 本地存储 | IndexedDB |
| 甘特图 | Frappe Gantt |

## 项目架构

```
frappe_gantt_sample/
├── src/
│   ├── main.ts                 # 入口文件
│   ├── App.vue                 # 根组件
│   ├── assets/
│   │   └── styles/
│   │       └── main.scss       # 全局样式
│   ├── components/
│   │   ├── GanttChart.vue      # 甘特图组件（封装 Frappe Gantt）
│   │   ├── TaskModal.vue       # 任务详情/编辑弹窗
│   │   └── Toolbar.vue         # 顶部工具栏
│   ├── services/
│   │   ├── database.ts         # IndexedDB 操作封装
│   │   ├── dataService.ts      # 数据 CRUD 业务逻辑
│   │   └── ganttAdapter.ts     # 甘特图数据适配器
│   ├── stores/
│   │   └── ganttStore.ts       # Pinia 状态管理
│   ├── types/
│   │   └── index.ts            # TypeScript 类型定义
│   ├── data/
│   │   └── presetData.ts       # 预设示例数据
│   ├── utils/
│   │   └── timeUtils.ts        # 时间处理工具
│   └── views/
│   │   └── GanttView.vue       # 主页面视图
├── public/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## 数据结构设计

### 业务数据类型

```typescript
// types/index.ts

export enum DataType {
  MAPPING = 1,    // 服务器映射指向关系
  PAUSED = 2      // 服务器暂停期，无指向
}

export interface ServerMapping {
  id: number;         // 记录唯一 ID，全局自增
  k: number;          // 源服务器 ID
  v: number | null;   // 目标服务器 ID，null 表示无指向或暂停期
  cmt: string;        // 备注
  ct: number;         // 创建时间（毫秒时间戳）
  st: number;         // 开始时间（毫秒时间戳，必须为当天 0 点）
  et: number | null;  // 结束时间（毫秒时间戳，必须为当天 0 点；null 表示持续进行中）
  type: DataType;     // 数据类型：1=映射，2=暂停
}
```

### 甘特图任务块类型

```typescript
export interface GanttTask {
  id: string;           // 格式：`${k}_${st}_${et ?? 'ongoing'}`
  name: string;         // 显示名称：服务器 ID
  start: string;        // ISO 格式时间
  end: string;          // ISO 格式时间（持续任务延伸显示）
  progress: number;     // 默认 0
  dependencies: string; // 依赖的任务块 ID
  custom_class?: string; // CSS 类：task-mapping/task-paused
  _serverId: number;    // 扩展：服务器 ID
  _mappingId: number;   // 扩展：业务数据 ID
}
```

### 数据转换规则

| 业务字段 | 甘特图字段 | 转换规则 |
|---------|-----------|---------|
| `k` | `id` 前缀 | 任务块 ID = `${k}_${st}_${et ?? 'ongoing'}` |
| `k` | `name` | 显示为服务器 ID |
| `st` | `start` | dayjs 转为 ISO 格式 |
| `et` | `end` | 有值转 ISO；null 延伸显示 30 天 |
| `v` | `dependencies` | type=1 且 v≠null 时设置依赖 |
| `type` | `custom_class` | 1 → 'task-mapping'，2 → 'task-paused' |

### 关键约束

1. **时间必须是当天 0 点**：st 和 et 只能是某一天的 00:00:00
2. **时间区间左闭右开 `[st, et)`**：任务块从 st 当天开始，在 et 当天结束（不包含 et 当天）
3. **任务块必须连续**：同一服务器的前一个任务块 et = 下一个任务块 st（左闭右开正好无缝衔接）
4. **et 可为 null**：表示任务持续进行中，没有结束时间
5. **新增时自动补充 et**：新增任务块时，自动将同一服务器未结束的任务块的 et 设置为新任务块的 st
6. **指向关系约束**：有指向关系的两个任务块，st 与 et 必须一致；被指向的任务块必须先存在
7. **无重叠**：相同服务器的时间段不能重叠

## 页面布局

**方案：甘特图单页面 + 弹窗编辑**

```
┌─────────────────────────────────────────┐
│  Toolbar                                │
│  [新增任务]  时间范围: [____] ~ [____]   │
│              [筛选]  [重置]              │
├─────────────────────────────────────────┤
│                                         │
│  GanttChart（全屏展示）                  │
│  - 每行 = 一个服务器                     │
│  - 任务块 = 指向关系/暂停期              │
│  - 点击弹出详情/编辑弹窗                 │
│                                         │
└─────────────────────────────────────────┘
```

## 功能设计

### 核心功能流程

| 功能 | 操作流程 | 弹窗内容 |
|------|---------|---------|
| 新增任务 | 点击"新增任务"按钮 | 选择服务器k、目标v、日期、备注、类型 |
| 查看详情 | 点击甘特图任务块 | 显示所有字段 + 编辑/删除按钮 |
| 编辑任务 | 详情弹窗点击"编辑" | 可修改v、备注、类型；时间不可改 |
| 删除任务 | 详情弹窗点击"删除" | 确认后删除，自动合并相邻任务 |
| 批量筛选 | 选择时间范围 → 点击"筛选" | 显示有交集的所有任务块 |

### TaskModal 状态流转

```
[详情模式] ──点击编辑──→ [编辑模式] ──保存──→ [详情模式]
     │                      │
     └──点击删除──→ [确认删除对话框]
```

### 时间选择约束

- 使用 Element Plus DatePicker，只选择日期
- 自动转换为当天 0 点时间戳
- 新增时校验连续性和日期占用情况

## IndexedDB 存储设计

### 数据库配置

```typescript
const DB_NAME = 'gantt_demo';
const DB_VERSION = 1;

const STORES = {
  mappings: 'server_mappings'
};

const INDEXES = [
  { name: 'by_k', keyPath: 'k' },
  { name: 'by_v', keyPath: 'v' },
  { name: 'by_st', keyPath: 'st' },
  { name: 'by_et', keyPath: 'et' },
  { name: 'by_type', keyPath: 'type' },
];
```

### CRUD 操作接口

```typescript
interface DataService {
  // 单条操作
  create(data: Partial<ServerMapping>): Promise<ServerMapping>;
  update(id: number, data: Partial<ServerMapping>): Promise<ServerMapping>;
  delete(id: number): Promise<void>;
  getById(id: number): Promise<ServerMapping | null>;

  // 批量操作
  getAll(): Promise<ServerMapping[]>;
  queryByTimeRange(start: number, end: number): Promise<ServerMapping[]>;
  queryByServer(serverId: number): Promise<ServerMapping[]>;

  // 校验辅助
  checkOverlap(serverId: number, st: number, et: number | null): Promise<boolean>;
  getUnfinishedTask(serverId: number): Promise<ServerMapping | null>;

  // 初始化
  initWithPresetData(): Promise<void>;
  clearAll(): Promise<void>;
}
```

### 批量查询逻辑

```typescript
// [st, et) 与 [t1, t2) 有交集的条件（左闭右开区间）：
// - et 为 null（持续进行）：只要 st < t2 就有交集
// - et 有值：st < t2 && et > t1

function queryByTimeRange(t1: number, t2: number): Promise<ServerMapping[]> {
  return getAll().filter(item =>
    item.st < t2 && (item.et === null || item.et > t1)
  );
}
```

### 新增逻辑（自动补充 et）

```typescript
async function create(data: Partial<ServerMapping>) {
  // 1. 检查是否有未结束的任务块（et === null）
  const unfinished = await getUnfinishedTask(data.k);

  // 2. 如果有，设置其 et 为新任务块的 st
  if (unfinished) {
    await update(unfinished.id, { et: data.st });
  }

  // 3. 创建新任务块
  return db.add('mappings', data);
}
```

## 甘特图适配器

```typescript
// services/ganttAdapter.ts

function toGanttTasks(mappings: ServerMapping[]): GanttTask[] {
  const grouped = groupBy(mappings, 'k');
  const tasks: GanttTask[] = [];

  for (const [serverId, items] of grouped) {
    items.sort((a, b) => a.st - b.st);

    for (const item of items) {
      const task: GanttTask = {
        id: `${serverId}_${item.st}_${item.et ?? 'ongoing'}`,
        name: `服务器 ${serverId}`,
        start: dayjs(item.st).toISOString(),
        end: item.et
          ? dayjs(item.et).toISOString()
          : dayjs().add(30, 'day').toISOString(),
        progress: 0,
        dependencies: item.v && item.type === 1
          ? `${item.v}_${item.st}_${item.et ?? 'ongoing'}`
          : '',
        custom_class: item.type === 1 ? 'task-mapping' : 'task-paused',
        _serverId: serverId,
        _mappingId: item.id,
      };
      tasks.push(task);
    }
  }

  return tasks;
}
```

## 预设数据

```typescript
// data/presetData.ts

// 服务器列表：[1, 2, 3, 4]
// 时间基准：2024-01-01 00:00:00 (timestamp: 1704067200000)

const presetData: ServerMapping[] = [
  // 服务器1：第1周映射到服务器2，第2周暂停
  { id: 1, k: 1, v: 2, cmt: '服务器1→服务器2', ct: Date.now(),
    st: 1704067200000, et: 1704672000000, type: 1 },
  { id: 2, k: 1, v: null, cmt: '服务器1暂停期', ct: Date.now(),
    st: 1704672000000, et: 1705276800000, type: 2 },

  // 服务器2：第1周被服务器1指向，第2周映射到服务器3（持续）
  { id: 3, k: 2, v: null, cmt: '服务器2被指向', ct: Date.now(),
    st: 1704067200000, et: 1704672000000, type: 1 },
  { id: 4, k: 2, v: 3, cmt: '服务器2→服务器3', ct: Date.now(),
    st: 1704672000000, et: null, type: 1 },

  // 服务器3：全程暂停（持续）
  { id: 5, k: 3, v: null, cmt: '服务器3暂停', ct: Date.now(),
    st: 1704067200000, et: null, type: 2 },

  // 服务器4：独立运行（持续）
  { id: 6, k: 4, v: 4, cmt: '服务器4独立', ct: Date.now(),
    st: 1704067200000, et: null, type: 1 },
];
```

## 移植说明

移植到 evo-manager 项目时需要注意：

1. **数据层**：替换 IndexedDB 为 evo-manager 的后端 API 调用
2. **组件层**：GanttChart.vue、TaskModal.vue 可直接移植
3. **样式**：已使用 Element Plus + Tailwind CSS，与目标项目一致
4. **状态管理**：Pinia store 可合并到目标项目的 store 结构