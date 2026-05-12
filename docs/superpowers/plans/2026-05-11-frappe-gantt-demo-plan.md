# Frappe Gantt Demo 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建一个甘特图 Demo 项目，演示军团战合服战场的服务器指向关系管理

**Architecture:** 单页面应用，甘特图全屏展示 + 弹窗编辑，IndexedDB 本地存储，Frappe Gantt 可视化

**Tech Stack:** Vue 3 + TypeScript + Vite + Element Plus + Tailwind CSS + Pinia + dayjs + IndexedDB + Frappe Gantt

---

## 文件结构

```
frappe_gantt_sample/
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── assets/styles/main.scss
│   ├── components/
│   │   ├── GanttChart.vue
│   │   ├── TaskModal.vue
│   │   └── Toolbar.vue
│   ├── services/
│   │   ├── database.ts
│   │   ├── dataService.ts
│   │   └── ganttAdapter.ts
│   ├── stores/ganttStore.ts
│   ├── types/index.ts
│   ├── data/presetData.ts
│   ├── utils/timeUtils.ts
│   └── views/GanttView.vue
├── public/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── tsconfig.json
```

---

## Task 1: 项目初始化

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/App.vue`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "frappe-gantt-demo",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.3.4",
    "pinia": "^2.1.3",
    "element-plus": "^2.2.30",
    "dayjs": "^1.11.20",
    "frappe-gantt": "^0.6.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^4.2.3",
    "typescript": "^5.0.2",
    "vite": "^4.4.5",
    "vue-tsc": "^1.8.5",
    "sass": "^1.62.1",
    "tailwindcss": "^3.3.2",
    "postcss": "^8.4.24",
    "autoprefixer": "^10.4.14"
  }
}
```

- [ ] **Step 2: 安装依赖**

Run: `npm install`
Expected: 依赖安装成功

- [ ] **Step 3: 创建 vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/assets/styles/main.scss" as *;`
      }
    }
  }
})
```

- [ ] **Step 4: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 5: 创建 tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 6: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>军团战合服战场管理 -甘特图 Demo</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 7: 创建 src/main.ts**

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import './assets/styles/main.scss'

const app = createApp(App)
app.use(createPinia())
app.use(ElementPlus)
app.mount('#app')
```

- [ ] **Step 8: 创建 src/App.vue**

```vue
<template>
  <div id="app" class="min-h-screen bg-gray-100">
    <GanttView />
  </div>
</template>

<script setup lang="ts">
import GanttView from './views/GanttView.vue'
</script>

<style>
#app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>
```

- [ ] **Step 9: 创建必要目录**

Run: `mkdir -p src/assets/styles src/components src/services src/stores src/types src/data src/utils src/views public`
Expected: 目录创建成功

- [ ] **Step 10: 提交**

```bash
git add .
git commit -m "feat: init vue3 + vite + typescript project"
```

---

## Task 2: Tailwind CSS 配置

**Files:**
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `src/assets/styles/main.scss`

- [ ] **Step 1: 创建 tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

- [ ] **Step 2: 创建 postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 3: 创建 src/assets/styles/main.scss**

```scss
@tailwind base;
@tailwind components;
@tailwind utilities;

// Frappe Gantt 任务块样式
.task-mapping {
  fill: #4CAF50 !important;
  stroke: #388E3C !important;
}

.task-paused {
  fill: #9E9E9E !important;
  stroke: #757575 !important;
}

// 依赖箭头样式
.gantt-dependency-arrow {
  stroke: #2196F3 !important;
  stroke-width: 2px !important;
}
```

- [ ] **Step 4: 提交**

```bash
git add .
git commit -m "feat: add tailwind css configuration"
```

---

## Task 3: 类型定义

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: 创建 src/types/index.ts**

```typescript
// 数据类型枚举
export enum DataType {
  MAPPING = 1,    // 服务器映射指向关系
  PAUSED = 2      // 服务器暂停期，无指向
}

// 单条记录数据结构
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
  custom_class?: string; // 自定义 CSS 类
  _serverId: number;    // 服务器 ID（扩展字段）
  _mappingId: number;   // 业务数据 ID（扩展字段）
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
```

- [ ] **Step 2: 提交**

```bash
git add src/types/index.ts
git commit -m "feat: add type definitions"
```

---

## Task 4: 时间处理工具

**Files:**
- Create: `src/utils/timeUtils.ts`

- [ ] **Step 1: 创建 src/utils/timeUtils.ts**

```typescript
import dayjs from 'dayjs'

/**
 * 将日期转换为当天 0 点的时间戳（毫秒）
 */
export function dateToZeroTimestamp(date: Date | string | number): number {
  return dayjs(date).startOf('day').valueOf()
}

/**
 * 时间戳转换为 ISO 格式字符串
 */
export function timestampToISO(timestamp: number): string {
  return dayjs(timestamp).toISOString()
}

/**
 * 时间戳转换为格式化日期字符串
 */
export function formatTimestamp(timestamp: number, format: string = 'YYYY-MM-DD'): string {
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
```

- [ ] **Step 2: 提交**

```bash
git add src/utils/timeUtils.ts
git commit -m "feat: add time utility functions"
```

---

## Task 5: IndexedDB 数据库服务

**Files:**
- Create: `src/services/database.ts`

- [ ] **Step 1: 创建 src/services/database.ts**

```typescript
import { ServerMapping } from '@/types'

const DB_NAME = 'gantt_demo'
const DB_VERSION = 1
const STORE_NAME = 'mappings'

let dbInstance: IDBDatabase | null = null

/**
 * 打开数据库连接
 */
export async function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // 创建存储对象
      const store = db.createObjectStore(STORE_NAME, {
        keyPath: 'id',
        autoIncrement: true
      })

      // 创建索引
      store.createIndex('by_k', 'k', { unique: false })
      store.createIndex('by_v', 'v', { unique: false })
      store.createIndex('by_st', 'st', { unique: false })
      store.createIndex('by_et', 'et', { unique: false })
      store.createIndex('by_type', 'type', { unique: false })
    }
  })
}

/**
 * 获取事务和存储对象
 */
async function getStore(mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
  const db = await openDatabase()
  const transaction = db.transaction(STORE_NAME, mode)
  return transaction.objectStore(STORE_NAME)
}

/**
 * 添加记录
 */
export async function addMapping(data: Omit<ServerMapping, 'id'>): Promise<ServerMapping> {
  const store = await getStore('readwrite')

  return new Promise((resolve, reject) => {
    const request = store.add(data)

    request.onerror = () => reject(request.error)

    request.onsuccess = () => {
      resolve({
        ...data,
        id: request.result as number
      })
    }
  })
}

/**
 * 更新记录
 */
export async function updateMapping(data: ServerMapping): Promise<ServerMapping> {
  const store = await getStore('readwrite')

  return new Promise((resolve, reject) => {
    const request = store.put(data)

    request.onerror = () => reject(request.error)

    request.onsuccess = () => resolve(data)
  })
}

/**
 * 删除记录
 */
export async function deleteMapping(id: number): Promise<void> {
  const store = await getStore('readwrite')

  return new Promise((resolve, reject) => {
    const request = store.delete(id)

    request.onerror = () => reject(request.error)

    request.onsuccess = () => resolve()
  })
}

/**
 * 根据 ID 获取记录
 */
export async function getMappingById(id: number): Promise<ServerMapping | null> {
  const store = await getStore()

  return new Promise((resolve, reject) => {
    const request = store.get(id)

    request.onerror = () => reject(request.error)

    request.onsuccess = () => resolve(request.result || null)
  })
}

/**
 * 获取所有记录
 */
export async function getAllMappings(): Promise<ServerMapping[]> {
  const store = await getStore()

  return new Promise((resolve, reject) => {
    const request = store.getAll()

    request.onerror = () => reject(request.error)

    request.onsuccess = () => resolve(request.result)
  })
}

/**
 * 根据索引查询记录
 */
export async function getMappingsByIndex(
  indexName: string,
  value: IDBValidKey
): Promise<ServerMapping[]> {
  const store = await getStore()
  const index = store.index(indexName)

  return new Promise((resolve, reject) => {
    const request = index.getAll(value)

    request.onerror = () => reject(request.error)

    request.onsuccess = () => resolve(request.result)
  })
}

/**
 * 清空所有记录
 */
export async function clearAllMappings(): Promise<void> {
  const store = await getStore('readwrite')

  return new Promise((resolve, reject) => {
    const request = store.clear()

    request.onerror = () => reject(request.error)

    request.onsuccess = () => resolve()
  })
}

/**
 * 批量添加记录
 */
export async function bulkAddMappings(data: Omit<ServerMapping, 'id'>[]): Promise<ServerMapping[]> {
  const db = await openDatabase()
  const transaction = db.transaction(STORE_NAME, 'readwrite')
  const store = transaction.objectStore(STORE_NAME)

  const results: ServerMapping[] = []
  let lastId = 0

  // 获取当前最大 ID
  const allData = await getAllMappings()
  lastId = allData.reduce((max, item) => Math.max(max, item.id), 0)

  for (const item of data) {
    lastId++
    const record = { ...item, id: lastId }
    store.add(record)
    results.push(record)
  }

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(results)
    transaction.onerror = () => reject(transaction.error)
  })
}
```

- [ ] **Step 2: 提交**

```bash
git add src/services/database.ts
git commit -m "feat: add IndexedDB database service"
```

---

## Task 6: 数据服务（业务逻辑）

**Files:**
- Create: `src/services/dataService.ts`

- [ ] **Step 1: 创建 src/services/dataService.ts**

```typescript
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
import { presetData } from '@/data/presetData'

/**
 * 获取指定服务器未结束的任务块（et === null）
 */
export async function getUnfinishedTask(serverId: number): Promise<ServerMapping | null> {
  const all = await getAllMappings()
  return all.find(item => item.k === serverId && item.et === null) || null
}

/**
 * 校验时间段是否与已有记录重叠
 */
export async function checkOverlap(
  serverId: number,
  st: number,
  et: number | null
): Promise<boolean> {
  const serverMappings = await getMappingsByIndex('by_k', serverId)

  for (const item of serverMappings) {
    // 排除自身（用于编辑场景）
    // 校验是否有交集
    if (hasTimeIntersection(item.st, item.et, st, et ?? Infinity)) {
      return true // 有重叠
    }
  }

  return false // 无重叠
}

/**
 * 创建新记录（自动补充前一个任务的 et）
 */
export async function createMapping(
  data: Partial<ServerMapping>
): Promise<ServerMapping> {
  // 必填字段校验
  if (data.k === undefined || data.st === undefined || data.type === undefined) {
    throw new Error('缺少必填字段：k, st, type')
  }

  // 检查是否有未结束的任务块
  const unfinished = await getUnfinishedTask(data.k)

  // 如果有，设置其 et 为新任务块的 st
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
 * 更新记录
 */
export async function updateMappingData(
  id: number,
  data: Partial<ServerMapping>
): Promise<ServerMapping> {
  const existing = await getMappingById(id)
  if (!existing) {
    throw new Error('记录不存在')
  }

  // 时间字段不允许修改
  const updated: ServerMapping = {
    ...existing,
    v: data.v ?? existing.v,
    cmt: data.cmt ?? existing.cmt,
    type: data.type ?? existing.type
  }

  return updateMapping(updated)
}

/**
 * 删除记录（合并相邻任务块）
 */
export async function deleteMappingData(id: number): Promise<void> {
  const existing = await getMappingById(id)
  if (!existing) return

  // 删除记录
  await deleteMapping(id)

  // 如果删除的任务块前后有任务，考虑合并
  // 简化处理：删除后不自动合并，由用户手动处理
}

/**
 * 批量查询：时间范围交集
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
  await bulkAddMappings(presetData)
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
```

- [ ] **Step 2: 提交**

```bash
git add src/services/dataService.ts
git commit -m "feat: add data service with business logic"
```

---

## Task 7: 预设数据

**Files:**
- Create: `src/data/presetData.ts`

- [ ] **Step 1: 创建 src/data/presetData.ts**

```typescript
import { ServerMapping, DataType } from '@/types'

// 服务器列表：[1, 2, 3, 4]
// 时间基准：2024-01-01 00:00:00 (timestamp: 1704067200000)
// 一周 = 7天 = 604800000 毫秒

const BASE_TIME = 1704067200000 // 2024-01-01 00:00:00
const ONE_WEEK = 604800000      // 7 天

export const presetData: Omit<ServerMapping, 'id'>[] = [
  // 服务器1：第1周映射到服务器2，第2周暂停
  {
    k: 1,
    v: 2,
    cmt: '服务器1→服务器2',
    ct: BASE_TIME,
    st: BASE_TIME,
    et: BASE_TIME + ONE_WEEK,
    type: DataType.MAPPING
  },
  {
    k: 1,
    v: null,
    cmt: '服务器1暂停期',
    ct: BASE_TIME,
    st: BASE_TIME + ONE_WEEK,
    et: BASE_TIME + ONE_WEEK * 2,
    type: DataType.PAUSED
  },

  // 服务器2：第1周被服务器1指向，第2周映射到服务器3（持续）
  {
    k: 2,
    v: null,
    cmt: '服务器2被指向',
    ct: BASE_TIME,
    st: BASE_TIME,
    et: BASE_TIME + ONE_WEEK,
    type: DataType.MAPPING
  },
  {
    k: 2,
    v: 3,
    cmt: '服务器2→服务器3',
    ct: BASE_TIME,
    st: BASE_TIME + ONE_WEEK,
    et: null, // 持续进行中
    type: DataType.MAPPING
  },

  // 服务器3：全程暂停（持续）
  {
    k: 3,
    v: null,
    cmt: '服务器3暂停',
    ct: BASE_TIME,
    st: BASE_TIME,
    et: null, // 持续进行中
    type: DataType.PAUSED
  },

  // 服务器4：独立运行（k=v，持续）
  {
    k: 4,
    v: 4,
    cmt: '服务器4独立',
    ct: BASE_TIME,
    st: BASE_TIME,
    et: null, // 持续进行中
    type: DataType.MAPPING
  }
]

// 导出服务器 ID 列表（用于下拉选择）
export const serverIds = [1, 2, 3, 4]
```

- [ ] **Step 2: 提交**

```bash
git add src/data/presetData.ts
git commit -m "feat: add preset demo data"
```

---

## Task 8: 甘特图适配器

**Files:**
- Create: `src/services/ganttAdapter.ts`

- [ ] **Step 1: 创建 src/services/ganttAdapter.ts**

```typescript
import { ServerMapping, GanttTask, DataType } from '@/types'
import { timestampToISO, getExtendedEndTime } from '@/utils/timeUtils'
import dayjs from 'dayjs'

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
 * 将业务数据转换为甘特图任务块
 */
export function toGanttTasks(mappings: ServerMapping[]): GanttTask[] {
  const grouped = groupByServer(mappings)
  const tasks: GanttTask[] = []

  for (const [serverId, items] of grouped) {
    // 每个服务器一行，任务块按时间排序
    items.sort((a, b) => a.st - b.st)

    for (const item of items) {
      const taskId = `${serverId}_${item.st}_${item.et ?? 'ongoing'}`

      // 处理依赖关系
      let dependencies = ''
      if (item.type === DataType.MAPPING && item.v !== null && item.v !== serverId) {
        // 指向其他服务器时，设置依赖
        dependencies = `${item.v}_${item.st}_${item.et ?? 'ongoing'}`
      }

      const task: GanttTask = {
        id: taskId,
        name: `服务器 ${serverId}`,
        start: timestampToISO(item.st),
        end: item.et
          ? timestampToISO(item.et)
          : timestampToISO(getExtendedEndTime(30)),
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
export function getGanttOptions(viewMode: 'Day' | 'Week' | 'Month' = 'Week') {
  return {
    view_mode: viewMode,
    date_format: 'YYYY-MM-DD',
    custom_popup_html: null // 禁用默认弹窗，使用自定义弹窗
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/services/ganttAdapter.ts
git commit -m "feat: add gantt adapter for data transformation"
```

---

## Task 9: Pinia Store

**Files:**
- Create: `src/stores/ganttStore.ts`

- [ ] **Step 1: 创建 src/stores/ganttStore.ts**

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ServerMapping, GanttTask, TimeRangeFilter } from '@/types'
import { dataService } from '@/services/dataService'
import { toGanttTasks } from '@/services/ganttAdapter'

export const useGanttStore = defineStore('gantt', () => {
  // 状态
  const mappings = ref<ServerMapping[]>([])
  const loading = ref(false)
  const timeRangeFilter = ref<TimeRangeFilter | null>(null)
  const selectedTask = ref<ServerMapping | null>(null)

  // 计算属性：甘特图任务块
  const ganttTasks = computed<GanttTask[]>(() => {
    return toGanttTasks(mappings.value)
  })

  // 计算属性：服务器 ID 列表（从数据中提取）
  const serverIds = computed<number[]>(() => {
    const ids = new Set<number>()
    for (const item of mappings.value) {
      ids.add(item.k)
      if (item.v !== null) ids.add(item.v)
    }
    return Array.from(ids).sort()
  })

  // 计算属性：筛选后的数据
  const filteredMappings = computed<ServerMapping[]>(() => {
    if (!timeRangeFilter.value) return mappings.value

    return mappings.value.filter(item => {
      const { start, end } = timeRangeFilter.value!
      // 有交集的条件
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
```

- [ ] **Step 2: 提交**

```bash
git add src/stores/ganttStore.ts
git commit -m "feat: add pinia store for gantt state management"
```

---

## Task 10: Toolbar 组件

**Files:**
- Create: `src/components/Toolbar.vue`

- [ ] **Step 1: 创建 src/components/Toolbar.vue**

```vue
<template>
  <div class="toolbar bg-white shadow-sm p-4 flex items-center gap-4">
    <!-- 新增按钮 -->
    <el-button type="primary" @click="handleCreate">
      <el-icon><Plus /></el-icon>
      新增任务
    </el-button>

    <!-- 时间范围筛选 -->
    <div class="flex items-center gap-2 ml-8">
      <span class="text-gray-600">时间范围:</span>
      <el-date-picker
        v-model="startDate"
        type="date"
        placeholder="开始日期"
        format="YYYY-MM-DD"
        value-format="x"
        :clearable="true"
      />
      <span class="text-gray-400">~</span>
      <el-date-picker
        v-model="endDate"
        type="date"
        placeholder="结束日期"
        format="YYYY-MM-DD"
        value-format="x"
        :clearable="true"
      />
      <el-button @click="handleFilter" :disabled="!startDate || !endDate">
        筛选
      </el-button>
      <el-button @click="handleReset" :disabled="!timeRangeFilter">
        重置
      </el-button>
    </div>

    <!-- 初始化预设数据 -->
    <el-button @click="handleInitPreset" class="ml-4">
      初始化预设数据
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { useGanttStore } from '@/stores/ganttStore'
import { dateToZeroTimestamp } from '@/utils/timeUtils'
import { ModalMode } from '@/types'

const emit = defineEmits<{
  (e: 'openModal', mode: ModalMode): void
}>()

const store = useGanttStore()

// 时间范围选择
const startDate = ref<number | null>(null)
const endDate = ref<number | null>(null)

// 当前筛选状态
const timeRangeFilter = computed(() => store.timeRangeFilter)

// 新增任务
function handleCreate() {
  emit('openModal', ModalMode.CREATE)
}

// 筛选
function handleFilter() {
  if (startDate.value && endDate.value) {
    const start = dateToZeroTimestamp(startDate.value)
    const end = dateToZeroTimestamp(endDate.value)

    if (start >= end) {
      // 提示错误：开始时间必须小于结束时间
      return
    }

    store.setTimeRangeFilter({ start, end })
  }
}

// 重置筛选
function handleReset() {
  startDate.value = null
  endDate.value = null
  store.setTimeRangeFilter(null)
}

// 初始化预设数据
async function handleInitPreset() {
  await store.initPreset()
}
</script>

<style scoped>
.toolbar {
  border-bottom: 1px solid #e5e7eb;
}
</style>
```

- [ ] **Step 2: 提交**

```bash
git add src/components/Toolbar.vue
git commit -m "feat: add toolbar component"
```

---

## Task 11: TaskModal 组件

**Files:**
- Create: `src/components/TaskModal.vue`

- [ ] **Step 1: 创建 src/components/TaskModal.vue**

```vue
<template>
  <el-dialog
    v-model="visible"
    :title="modalTitle"
    width="500px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <!-- 详情/编辑表单 -->
    <el-form :model="formData" label-width="100px" v-if="mode !== ModalMode.VIEW">
      <el-form-item label="服务器 ID">
        <el-select v-model="formData.k" placeholder="选择服务器" :disabled="mode === ModalMode.EDIT">
          <el-option v-for="id in serverIds" :key="id" :label="`服务器 ${id}`" :value="id" />
        </el-select>
      </el-form-item>

      <el-form-item label="目标服务器" v-if="formData.type === DataType.MAPPING">
        <el-select v-model="formData.v" placeholder="选择目标服务器" clearable>
          <el-option v-for="id in serverIds" :key="id" :label="`服务器 ${id}`" :value="id" />
        </el-select>
        <div class="text-gray-400 text-sm mt-1">留空表示无指向</div>
      </el-form-item>

      <el-form-item label="开始日期" v-if="mode === ModalMode.CREATE">
        <el-date-picker
          v-model="formData.st"
          type="date"
          placeholder="选择开始日期"
          format="YYYY-MM-DD"
          value-format="x"
        />
      </el-form-item>

      <el-form-item label="结束日期" v-if="mode === ModalMode.CREATE">
        <el-date-picker
          v-model="formData.et"
          type="date"
          placeholder="选择结束日期（可选）"
          format="YYYY-MM-DD"
          value-format="x"
          :clearable="true"
        />
        <div class="text-gray-400 text-sm mt-1">留空表示持续进行中</div>
      </el-form-item>

      <el-form-item label="数据类型">
        <el-radio-group v-model="formData.type">
          <el-radio :value="DataType.MAPPING">映射指向</el-radio>
          <el-radio :value="DataType.PAUSED">暂停期</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="备注">
        <el-input v-model="formData.cmt" type="textarea" :rows="2" placeholder="输入备注" />
      </el-form-item>
    </el-form>

    <!-- 详情展示 -->
    <div v-if="mode === ModalMode.VIEW && currentTask" class="detail-view">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="ID">{{ currentTask.id }}</el-descriptions-item>
        <el-descriptions-item label="服务器">{{ currentTask.k }}</el-descriptions-item>
        <el-descriptions-item label="目标服务器">{{ currentTask.v ?? '无' }}</el-descriptions-item>
        <el-descriptions-item label="开始时间">{{ formatTime(currentTask.st) }}</el-descriptions-item>
        <el-descriptions-item label="结束时间">{{ currentTask.et ? formatTime(currentTask.et) : '持续进行中' }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ currentTask.type === DataType.MAPPING ? '映射指向' : '暂停期' }}</el-descriptions-item>
        <el-descriptions-item label="备注">{{ currentTask.cmt || '无' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatTime(currentTask.ct) }}</el-descriptions-item>
      </el-descriptions>
    </div>

    <!-- 操作按钮 -->
    <template #footer>
      <div class="flex justify-between">
        <div v-if="mode === ModalMode.VIEW && currentTask">
          <el-button type="danger" @click="handleDelete">删除</el-button>
        </div>
        <div class="flex gap-2">
          <el-button @click="handleClose">取消</el-button>
          <el-button v-if="mode === ModalMode.VIEW" type="primary" @click="switchToEdit">编辑</el-button>
          <el-button v-if="mode !== ModalMode.VIEW" type="primary" @click="handleSave" :loading="saving">保存</el-button>
        </div>
      </div>
    </template>
  </el-dialog>

  <!-- 删除确认对话框 -->
  <el-dialog v-model="deleteConfirmVisible" title="确认删除" width="300px">
    <p>确定要删除这条记录吗？</p>
    <template #footer>
      <el-button @click="deleteConfirmVisible = false">取消</el-button>
      <el-button type="danger" @click="confirmDelete">确认删除</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGanttStore } from '@/stores/ganttStore'
import { ModalMode, DataType, ServerMapping } from '@/types'
import { formatTimestamp, dateToZeroTimestamp } from '@/utils/timeUtils'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  mode: ModalMode
  task?: ServerMapping | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const store = useGanttStore()

// 状态
const visible = ref(true)
const saving = ref(false)
const deleteConfirmVisible = ref(false)
const currentMode = ref<ModalMode>(props.mode)
const currentTask = ref<ServerMapping | null>(props.task || null)

// 表单数据
const formData = ref({
  k: 1,
  v: null as number | null,
  st: null as number | null,
  et: null as number | null,
  type: DataType.MAPPING,
  cmt: ''
})

// 计算属性
const mode = computed(() => currentMode.value)

const modalTitle = computed(() => {
  switch (mode.value) {
    case ModalMode.CREATE:
      return '新增任务'
    case ModalMode.EDIT:
      return '编辑任务'
    case ModalMode.VIEW:
      return '任务详情'
    default:
      return ''
  }
})

const serverIds = computed(() => store.serverIds)

// 初始化表单数据
watch([() => props.mode, () => props.task], () => {
  currentMode.value = props.mode
  currentTask.value = props.task || null

  if (props.task) {
    formData.value = {
      k: props.task.k,
      v: props.task.v,
      st: props.task.st,
      et: props.task.et,
      type: props.task.type,
      cmt: props.task.cmt
    }
  } else {
    formData.value = {
      k: serverIds.value[0] || 1,
      v: null,
      st: null,
      et: null,
      type: DataType.MAPPING,
      cmt: ''
    }
  }
}, { immediate: true })

// 格式化时间
function formatTime(timestamp: number): string {
  return formatTimestamp(timestamp, 'YYYY-MM-DD HH:mm:ss')
}

// 切换到编辑模式
function switchToEdit() {
  currentMode.value = ModalMode.EDIT
}

// 保存
async function handleSave() {
  saving.value = true

  try {
    if (mode.value === ModalMode.CREATE) {
      // 校验必填字段
      if (!formData.value.st) {
        ElMessage.error('请选择开始日期')
        return
      }

      // 转换时间戳为当天 0 点
      const st = dateToZeroTimestamp(formData.value.st)
      const et = formData.value.et ? dateToZeroTimestamp(formData.value.et) : null

      await store.create({
        k: formData.value.k,
        v: formData.value.v,
        st,
        et,
        type: formData.value.type,
        cmt: formData.value.cmt
      })

      ElMessage.success('创建成功')
    } else if (mode.value === ModalMode.EDIT && currentTask.value) {
      await store.update(currentTask.value.id, {
        v: formData.value.v,
        type: formData.value.type,
        cmt: formData.value.cmt
      })

      ElMessage.success('更新成功')
    }

    handleClose()
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    saving.value = false
  }
}

// 删除
function handleDelete() {
  deleteConfirmVisible.value = true
}

// 确认删除
async function confirmDelete() {
  if (!currentTask.value) return

  try {
    await store.deleteMapping(currentTask.value.id)
    deleteConfirmVisible.value = false
    ElMessage.success('删除成功')
    handleClose()
  } catch (error: any) {
    ElMessage.error(error.message || '删除失败')
  }
}

// 关闭弹窗
function handleClose() {
  visible.value = false
  emit('close')
}
</script>

<style scoped>
.detail-view {
  padding: 16px 0;
}
</style>
```

- [ ] **Step 2: 提交**

```bash
git add src/components/TaskModal.vue
git commit -m "feat: add task modal for create/edit/view/delete"
```

---

## Task 12: GanttChart 组件

**Files:**
- Create: `src/components/GanttChart.vue`

- [ ] **Step 1: 创建 src/components/GanttChart.vue**

```vue
<template>
  <div class="gantt-chart-container" ref="containerRef">
    <div v-if="loading" class="loading-overlay">
      <el-icon class="is-loading" size="40"><Loading /></el-icon>
    </div>
    <div v-if="!loading && ganttTasks.length === 0" class="empty-state">
      <p class="text-gray-500">暂无数据，请点击"初始化预设数据"或"新增任务"</p>
    </div>
    <div ref="ganttRef" class="gantt-wrapper"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { useGanttStore } from '@/stores/ganttStore'
import { GanttTask, ModalMode, ServerMapping } from '@/types'
import { parseTaskId } from '@/services/ganttAdapter'
import Gantt from 'frappe-gantt'
import dayjs from 'dayjs'

const emit = defineEmits<{
  (e: 'taskClick', task: ServerMapping): void
}>()

const store = useGanttStore()

// refs
const containerRef = ref<HTMLDivElement | null>(null)
const ganttRef = ref<HTMLDivElement | null>(null)
const ganttInstance = ref<Gantt | null>(null)

// 计算属性
const loading = computed(() => store.loading)
const ganttTasks = computed(() => store.ganttTasks)

// 初始化甘特图
function initGantt() {
  if (!ganttRef.value || ganttTasks.value.length === 0) return

  // 销毁旧实例
  if (ganttInstance.value) {
    ganttInstance.value = null
  }

  // 创建新实例
  ganttInstance.value = new Gantt(ganttRef.value, ganttTasks.value, {
    view_mode: 'Week',
    date_format: 'YYYY-MM-DD',
    custom_popup_html: null,
    on_click: (task: GanttTask) => {
      handleTaskClick(task)
    }
  })
}

// 处理任务块点击
async function handleTaskClick(task: GanttTask) {
  const mappingId = task._mappingId
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
  min-height: 400px;
  padding: 20px;
}
</style>
```

- [ ] **Step 2: 提交**

```bash
git add src/components/GanttChart.vue
git commit -m "feat: add gantt chart component with frappe-gantt"
```

---

## Task 13: GanttView 主页面

**Files:**
- Create: `src/views/GanttView.vue`

- [ ] **Step 1: 创建 src/views/GanttView.vue**

```vue
<template>
  <div class="gantt-view flex flex-col h-screen">
    <!-- 顶部工具栏 -->
    <Toolbar @openModal="handleOpenModal" />

    <!-- 甘特图区域 -->
    <GanttChart @taskClick="handleTaskClick" />

    <!-- 任务弹窗 -->
    <TaskModal
      v-if="modalVisible"
      :mode="modalMode"
      :task="selectedTask"
      @close="handleModalClose"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Toolbar from '@/components/Toolbar.vue'
import GanttChart from '@/components/GanttChart.vue'
import TaskModal from '@/components/TaskModal.vue'
import { ModalMode, ServerMapping } from '@/types'

// 弹窗状态
const modalVisible = ref(false)
const modalMode = ref<ModalMode>(ModalMode.VIEW)
const selectedTask = ref<ServerMapping | null>(null)

// 打开弹窗
function handleOpenModal(mode: ModalMode) {
  modalMode.value = mode
  selectedTask.value = null
  modalVisible.value = true
}

// 处理任务块点击
function handleTaskClick(task: ServerMapping) {
  modalMode.value = ModalMode.VIEW
  selectedTask.value = task
  modalVisible.value = true
}

// 关闭弹窗
function handleModalClose() {
  modalVisible.value = false
  selectedTask.value = null
}
</script>

<style scoped>
.gantt-view {
  overflow: hidden;
}
</style>
```

- [ ] **Step 2: 提交**

```bash
git add src/views/GanttView.vue
git commit -m "feat: add main gantt view page"
```

---

## Task 14: Frappe Gantt 类型声明

**Files:**
- Create: `src/types/frappe-gantt.d.ts`

- [ ] **Step 1: 创建类型声明文件 frappe-gantt.d.ts**

Frappe Gantt 没有官方 TypeScript 类型，需要创建声明文件。

```typescript
declare module 'frappe-gantt' {
  interface GanttOptions {
    view_mode?: 'Day' | 'Week' | 'Month' | 'Quarter Day' | 'Half Day'
    date_format?: string
    custom_popup_html?: string | null | ((task: GanttTask) => string)
    on_click?: (task: GanttTask) => void
    on_date_change?: (task: GanttTask, start: Date, end: Date) => void
    on_progress_change?: (task: GanttTask, progress: number) => void
    on_view_change?: (mode: string) => void
  }

  interface GanttTask {
    id: string
    name: string
    start: string
    end: string
    progress?: number
    dependencies?: string
    custom_class?: string
  }

  class Gantt {
    constructor(element: HTMLElement | string, tasks: GanttTask[], options?: GanttOptions)
    change_view_mode(mode: 'Day' | 'Week' | 'Month' | 'Quarter Day' | 'Half Day'): void
    refresh(tasks: GanttTask[]): void
  }

  export default Gantt
}
```

- [ ] **Step 2: 提交**

```bash
git add src/types/frappe-gantt.d.ts
git commit -m "feat: add frappe-gantt type declarations"
```

---

## Task 15: 添加 Element Plus 图标

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: 安装 Element Plus 图标包**

Run: `npm install @element-plus/icons-vue`
Expected: 安装成功

- [ ] **Step 2: 修改 src/main.ts 注册图标**

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import App from './App.vue'
import './assets/styles/main.scss'

const app = createApp(App)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(ElementPlus)
app.mount('#app')
```

- [ ] **Step 3: 提交**

```bash
git add src/main.ts package.json package-lock.json
git commit -m "feat: register element-plus icons globally"
```

---

## Task 16: 修复 Vue 导入问题

**Files:**
- Modify: `src/components/GanttChart.vue`

- [ ] **Step 1: 修复 computed 导入**

在 GanttChart.vue 中添加 computed 导入：

```vue
<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
// ... 其余代码不变
```

- [ ] **Step 2: 提交**

```bash
git add src/components/GanttChart.vue
git commit -m "fix: add missing computed import"
```

---

## Task 17: 测试与验证

**Files:**
- 无新增文件

- [ ] **Step 1: 运行开发服务器**

Run: `npm run dev`
Expected: 服务启动，显示本地 URL（如 http://localhost:5173）

- [ ] **Step 2: 验证功能**

在浏览器中验证：
1. 页面正常加载，显示甘特图
2. 点击"初始化预设数据"，甘特图显示预设任务块
3. 点击任务块，弹出详情弹窗
4. 点击"编辑"，切换到编辑模式
5. 点击"新增任务"，打开新增弹窗
6. 时间范围筛选功能正常

- [ ] **Step 3: 构建测试**

Run: `npm run build`
Expected: 构建成功，无错误

- [ ] **Step 4: 提交最终版本**

```bash
git add .
git commit -m "feat: complete frappe-gantt-demo implementation"
```

---

## 自审检查

**1. Spec 覆盖检查：**

| Spec 要求 | Task |
|-----------|------|
| Vue 3 + TypeScript + Vite | Task 1 |
| Tailwind CSS + Sass | Task 2 |
| Element Plus | Task 1, Task 15 |
| 类型定义（ServerMapping, GanttTask） | Task 3 |
| 时间处理工具（dayjs, 0点转换） | Task 4 |
| IndexedDB 存储 | Task 5 |
| 数据服务（CRUD, 自动补充 et） | Task 6 |
| 预设数据 | Task 7 |
| 甘特图适配器 | Task 8 |
| Pinia Store | Task 9 |
| Toolbar 组件 | Task 10 |
| TaskModal 组件（弹窗编辑） | Task 11 |
| GanttChart 组件 | Task 12 |
| GanttView 主页面 | Task 13 |
| Frappe Gantt 类型声明 | Task 14 |

**2. Placeholder 检查：** 无 TBD/TODO

**3. 类型一致性检查：**
- ServerMapping.id 在 Task 3 定义为 number，Task 5/6 使用一致
- GanttTask._mappingId 在 Task 3 定义，Task 12 使用一致
- DataType 枚举在 Task 3 定义，Task 7/11 使用一致