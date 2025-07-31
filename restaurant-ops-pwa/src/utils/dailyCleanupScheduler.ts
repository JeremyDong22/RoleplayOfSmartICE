// 每日清理调度器 - 在早上8点自动清理数据
// 与门店关闭逻辑同步执行

import { indexedDBManager } from './indexedDBManager'
import { storageManager } from './improvedStorageManager'

interface CleanupResult {
  localStorageCleared: string[]
  photosDeleted: number
  indexedDBCleared: boolean
  timestamp: Date
  errors: string[]
}

export class DailyCleanupScheduler {
  private cleanupTime = { hour: 8, minute: 0 } // 早上8点
  private timeoutId: NodeJS.Timeout | null = null
  
  // 开始调度
  start() {
    console.log('[Cleanup Scheduler] Starting daily cleanup scheduler')
    this.scheduleNextCleanup()
    
    // 监听存储事件，检查是否需要立即清理
    window.addEventListener('storage', this.handleStorageEvent)
  }
  
  // 停止调度
  stop() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
    window.removeEventListener('storage', this.handleStorageEvent)
  }
  
  // 计算下次清理时间
  private getNextCleanupTime(): Date {
    const now = new Date()
    const next = new Date()
    
    // 设置为今天早上8点
    next.setHours(this.cleanupTime.hour, this.cleanupTime.minute, 0, 0)
    
    // 如果已经过了今天的8点，设置为明天8点
    if (now >= next) {
      next.setDate(next.getDate() + 1)
    }
    
    return next
  }
  
  // 调度下次清理
  private scheduleNextCleanup() {
    const now = new Date()
    const nextCleanup = this.getNextCleanupTime()
    const delay = nextCleanup.getTime() - now.getTime()
    
    console.log(`[Cleanup Scheduler] Next cleanup scheduled at: ${nextCleanup.toLocaleString()}`)
    console.log(`[Cleanup Scheduler] Will run in ${Math.round(delay / 1000 / 60)} minutes`)
    
    this.timeoutId = setTimeout(() => {
      this.performCleanup()
      this.scheduleNextCleanup() // 调度下一次
    }, delay)
  }
  
  // 执行清理
  async performCleanup(): Promise<CleanupResult> {
    console.log('[Cleanup Scheduler] Starting daily cleanup at', new Date().toLocaleString())
    
    const result: CleanupResult = {
      localStorageCleared: [],
      photosDeleted: 0,
      indexedDBCleared: false,
      timestamp: new Date(),
      errors: []
    }
    
    try {
      // 1. 清理 localStorage
      console.log('[Cleanup] Step 1: Clearing localStorage...')
      result.localStorageCleared = this.cleanupLocalStorage()
      
      // 2. 清理 IndexedDB 中的照片
      console.log('[Cleanup] Step 2: Clearing photos from IndexedDB...')
      result.photosDeleted = await this.cleanupPhotos()
      
      // 3. 清理其他 IndexedDB 数据
      console.log('[Cleanup] Step 3: Clearing other IndexedDB data...')
      result.indexedDBCleared = await this.cleanupIndexedDB()
      
      // 4. 清理临时文件和缓存
      console.log('[Cleanup] Step 4: Clearing temporary data...')
      this.cleanupTemporaryData()
      
      // 5. 记录清理日志
      this.logCleanupResult(result)
      
      // 6. 发送清理完成通知
      this.notifyCleanupComplete(result)
      
    } catch (error) {
      console.error('[Cleanup] Error during cleanup:', error)
      result.errors.push(error.message)
    }
    
    return result
  }
  
  // 清理 localStorage
  private cleanupLocalStorage(): string[] {
    const keysToKeep = [
      'selectedRole', // 保留用户角色选择
      'userPreferences', // 保留用户偏好设置
    ]
    
    const clearedKeys: string[] = []
    const allKeys = Object.keys(localStorage)
    
    allKeys.forEach(key => {
      // 跳过需要保留的键
      if (keysToKeep.some(keep => key.includes(keep))) {
        return
      }
      
      // 清理所有任务相关数据
      if (
        key.includes('restaurant-ops-') ||
        key.includes('dutyManager') ||
        key.includes('photo-collection-') ||
        key.includes('broadcast_') ||
        key.includes('task') ||
        key.includes('closing-confirmed')
      ) {
        try {
          localStorage.removeItem(key)
          clearedKeys.push(key)
        } catch (error) {
          console.error(`Failed to remove ${key}:`, error)
        }
      }
    })
    
    console.log(`[Cleanup] Cleared ${clearedKeys.length} localStorage keys`)
    return clearedKeys
  }
  
  // 清理照片
  private async cleanupPhotos(): Promise<number> {
    try {
      await indexedDBManager.init()
      
      // 获取所有照片
      const stats = await indexedDBManager.getUsageStats()
      const photoCount = stats.photoCount
      
      // 删除所有照片
      // 注意：这里删除所有照片，因为是每天早上8点的完全重置
      await indexedDBManager.cleanup(0) // 0天 = 删除所有
      
      console.log(`[Cleanup] Deleted ${photoCount} photos from IndexedDB`)
      return photoCount
      
    } catch (error) {
      console.error('[Cleanup] Error cleaning photos:', error)
      return 0
    }
  }
  
  // 清理 IndexedDB
  private async cleanupIndexedDB(): Promise<boolean> {
    try {
      // 如果需要完全清空 IndexedDB
      const databases = await indexedDB.databases()
      
      for (const db of databases) {
        if (db.name?.includes('RestaurantOps')) {
          await indexedDB.deleteDatabase(db.name)
          console.log(`[Cleanup] Deleted database: ${db.name}`)
        }
      }
      
      return true
    } catch (error) {
      console.error('[Cleanup] Error cleaning IndexedDB:', error)
      return false
    }
  }
  
  // 清理临时数据
  private cleanupTemporaryData() {
    // 清理所有 broadcast_ 开头的键
    const allKeys = Object.keys(localStorage)
    allKeys.forEach(key => {
      if (key.startsWith('broadcast_')) {
        localStorage.removeItem(key)
      }
    })
    
    // 触发垃圾回收（如果可用）
    if (window.gc) {
      window.gc()
    }
  }
  
  // 记录清理结果
  private logCleanupResult(result: CleanupResult) {
    const log = {
      ...result,
      date: result.timestamp.toLocaleDateString(),
      time: result.timestamp.toLocaleTimeString()
    }
    
    // 保存最近的清理日志（保留7天）
    const logs = this.getCleanupLogs()
    logs.push(log)
    
    // 只保留最近7天的日志
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
    const recentLogs = logs.filter(l => new Date(l.timestamp).getTime() > sevenDaysAgo)
    
    localStorage.setItem('cleanup-logs', JSON.stringify(recentLogs))
  }
  
  // 获取清理日志
  private getCleanupLogs(): any[] {
    try {
      const logs = localStorage.getItem('cleanup-logs')
      return logs ? JSON.parse(logs) : []
    } catch {
      return []
    }
  }
  
  // 发送清理完成通知
  private notifyCleanupComplete(result: CleanupResult) {
    // 创建自定义事件
    const event = new CustomEvent('daily-cleanup-complete', {
      detail: result
    })
    window.dispatchEvent(event)
    
    // 如果有错误，在控制台警告
    if (result.errors.length > 0) {
      console.warn('[Cleanup] Completed with errors:', result.errors)
    } else {
      console.log('[Cleanup] Daily cleanup completed successfully')
    }
  }
  
  // 处理存储事件（用于手动触发清理）
  private handleStorageEvent = (e: StorageEvent) => {
    if (e.key === 'trigger-manual-cleanup' && e.newValue === 'true') {
      console.log('[Cleanup] Manual cleanup triggered')
      this.performCleanup()
      localStorage.removeItem('trigger-manual-cleanup')
    }
  }
  
  // 获取清理状态
  getStatus() {
    const nextCleanup = this.getNextCleanupTime()
    const logs = this.getCleanupLogs()
    const lastCleanup = logs[logs.length - 1]
    
    return {
      isRunning: this.timeoutId !== null,
      nextCleanupTime: nextCleanup,
      lastCleanupResult: lastCleanup || null,
      cleanupHistory: logs
    }
  }
  
  // 手动触发清理
  async triggerManualCleanup(): Promise<CleanupResult> {
    console.log('[Cleanup] Manual cleanup triggered by user')
    return await this.performCleanup()
  }
}

// 导出单例
export const dailyCleanupScheduler = new DailyCleanupScheduler()