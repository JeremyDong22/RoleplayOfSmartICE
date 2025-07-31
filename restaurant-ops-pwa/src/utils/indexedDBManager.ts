// IndexedDB 管理器 - 用于存储大型数据如照片
// 提供更好的性能和更大的存储容量

interface DBStore {
  name: string
  keyPath: string
  indexes?: Array<{
    name: string
    keyPath: string
    unique?: boolean
  }>
}

class IndexedDBManager {
  private dbName = 'RestaurantOpsDB'
  private dbVersion = 1
  private db: IDBDatabase | null = null
  
  private stores: DBStore[] = [
    {
      name: 'photos',
      keyPath: 'id',
      indexes: [
        { name: 'taskId', keyPath: 'taskId' },
        { name: 'timestamp', keyPath: 'timestamp' }
      ]
    },
    {
      name: 'largeData',
      keyPath: 'key'
    }
  ]
  
  // 初始化数据库
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)
      
      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'))
      }
      
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // 创建对象存储
        this.stores.forEach(store => {
          if (!db.objectStoreNames.contains(store.name)) {
            const objectStore = db.createObjectStore(store.name, {
              keyPath: store.keyPath,
              autoIncrement: store.keyPath === 'id'
            })
            
            // 创建索引
            store.indexes?.forEach(index => {
              objectStore.createIndex(index.name, index.keyPath, {
                unique: index.unique || false
              })
            })
          }
        })
      }
    })
  }
  
  // 保存照片
  async savePhoto(taskId: string, photo: {
    url: string
    caption?: string
    groupIndex: number
  }): Promise<string> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['photos'], 'readwrite')
      const store = transaction.objectStore('photos')
      
      const photoData = {
        taskId,
        ...photo,
        timestamp: Date.now()
      }
      
      const request = store.add(photoData)
      
      request.onsuccess = () => {
        resolve(request.result as string)
      }
      
      request.onerror = () => {
        reject(new Error('Failed to save photo'))
      }
    })
  }
  
  // 获取任务的所有照片
  async getPhotosByTask(taskId: string): Promise<any[]> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['photos'], 'readonly')
      const store = transaction.objectStore('photos')
      const index = store.index('taskId')
      
      const request = index.getAll(taskId)
      
      request.onsuccess = () => {
        resolve(request.result)
      }
      
      request.onerror = () => {
        reject(new Error('Failed to get photos'))
      }
    })
  }
  
  // 删除任务的所有照片
  async deletePhotosByTask(taskId: string): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['photos'], 'readwrite')
      const store = transaction.objectStore('photos')
      const index = store.index('taskId')
      
      const request = index.openCursor(taskId)
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          resolve()
        }
      }
      
      request.onerror = () => {
        reject(new Error('Failed to delete photos'))
      }
    })
  }
  
  // 获取数据库使用情况
  async getUsageStats(): Promise<{
    photoCount: number
    estimatedSize: number
  }> {
    if (!this.db) await this.init()
    
    const stats = {
      photoCount: 0,
      estimatedSize: 0
    }
    
    // 获取照片数量
    const transaction = this.db!.transaction(['photos'], 'readonly')
    const store = transaction.objectStore('photos')
    const countRequest = store.count()
    
    return new Promise((resolve) => {
      countRequest.onsuccess = async () => {
        stats.photoCount = countRequest.result
        
        // 估算存储大小
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const estimate = await navigator.storage.estimate()
          stats.estimatedSize = estimate.usage || 0
        }
        
        resolve(stats)
      }
    })
  }
  
  // 清理过期数据
  async cleanup(daysToKeep: number = 7): Promise<number> {
    if (!this.db) await this.init()
    
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000)
    let deletedCount = 0
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['photos'], 'readwrite')
      const store = transaction.objectStore('photos')
      const index = store.index('timestamp')
      
      const range = IDBKeyRange.upperBound(cutoffTime)
      const request = index.openCursor(range)
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          cursor.delete()
          deletedCount++
          cursor.continue()
        } else {
          resolve(deletedCount)
        }
      }
      
      request.onerror = () => {
        reject(new Error('Failed to cleanup old data'))
      }
    })
  }
}

export const indexedDBManager = new IndexedDBManager()

// 混合存储策略
export class HybridStorageStrategy {
  // 小数据用 localStorage，大数据用 IndexedDB
  async saveData(key: string, data: any): Promise<boolean> {
    const dataStr = JSON.stringify(data)
    const sizeInKB = dataStr.length / 1024
    
    // 小于 100KB 用 localStorage
    if (sizeInKB < 100) {
      return storageManager.setItem(key, data)
    } else {
      // 大于 100KB 用 IndexedDB
      try {
        await indexedDBManager.init()
        // 实现 IndexedDB 存储逻辑
        return true
      } catch (error) {
        console.error('Failed to save to IndexedDB:', error)
        return false
      }
    }
  }
}