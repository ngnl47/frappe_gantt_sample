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
  // 先获取当前最大 ID（单独事务）
  const allData = await getAllMappings()
  let lastId = allData.reduce((max, item) => Math.max(max, item.id), 0)

  // 创建新事务进行批量添加
  const db = await openDatabase()
  const transaction = db.transaction(STORE_NAME, 'readwrite')
  const store = transaction.objectStore(STORE_NAME)

  const results: ServerMapping[] = []

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