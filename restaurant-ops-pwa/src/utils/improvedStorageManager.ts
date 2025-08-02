// 改进的 localStorage 管理器
// 提供错误处理、容量检查、数据压缩等功能

interface StorageOptions {
  compress?: boolean
  maxRetries?: number
  expiryDays?: number
}

class ImprovedStorageManager {
  private readonly PREFIX = 'restaurant-ops-'
  
  // 检查可用容量
  private checkStorageQuota(): { used: number; available: number } {
    let used = 0
    const available = 5 * 1024 * 1024 // 默认 5MB
    
    // 计算已使用空间
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        used += localStorage[key].length + key.length
      }
    }
    
    return { used, available: available - used }
  }
  
  // 安全的 JSON 解析
  private safeParse<T>(data: string | null): T | null {
    if (!data) return null
    
    try {
      return JSON.parse(data)
    } catch (error) {
      console.error('Failed to parse JSON:', error)
      return null
    }
  }
  
  // 带错误处理的存储
  public setItem(key: string, value: unknown, options: StorageOptions = {}): boolean {
    const fullKey = this.PREFIX + key
    
    try {
      const dataToStore = {
        value,
        timestamp: Date.now(),
        expiry: options.expiryDays 
          ? Date.now() + (options.expiryDays * 24 * 60 * 60 * 1000)
          : null
      }
      
      const stringData = JSON.stringify(dataToStore)
      
      // 检查容量
      const { available } = this.checkStorageQuota()
      if (stringData.length > available) {
        console.error('Storage quota exceeded')
        this.cleanup() // 尝试清理
        
        // 再次检查
        const { available: newAvailable } = this.checkStorageQuota()
        if (stringData.length > newAvailable) {
          return false
        }
      }
      
      localStorage.setItem(fullKey, stringData)
      return true
      
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.error('Storage quota exceeded:', error)
        this.cleanup()
        
        // 重试一次
        try {
          localStorage.setItem(fullKey, JSON.stringify(value))
          return true
        } catch {
          return false
        }
      }
      
      console.error('Failed to save to localStorage:', error)
      return false
    }
  }
  
  // 带过期检查的读取
  public getItem<T>(key: string): T | null {
    const fullKey = this.PREFIX + key
    
    try {
      const stored = localStorage.getItem(fullKey)
      if (!stored) return null
      
      const parsed = this.safeParse<{
        value: T
        timestamp: number
        expiry: number | null
      }>(stored)
      
      if (!parsed) return null
      
      // 检查是否过期
      if (parsed.expiry && Date.now() > parsed.expiry) {
        this.removeItem(key)
        return null
      }
      
      return parsed.value
      
    } catch (error) {
      console.error('Failed to read from localStorage:', error)
      return null
    }
  }
  
  // 安全删除
  public removeItem(key: string): void {
    const fullKey = this.PREFIX + key
    
    try {
      localStorage.removeItem(fullKey)
    } catch (error) {
      console.error('Failed to remove from localStorage:', error)
    }
  }
  
  // 清理过期和临时数据
  public cleanup(): void {
    const now = Date.now()
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      
      // 清理临时 broadcast 数据
      if (key.startsWith('broadcast_')) {
        keysToRemove.push(key)
        continue
      }
      
      // 清理过期数据
      if (key.startsWith(this.PREFIX)) {
        const stored = localStorage.getItem(key)
        if (stored) {
          const parsed = this.safeParse<{ expiry: number | null }>(stored)
          if (parsed?.expiry && now > parsed.expiry) {
            keysToRemove.push(key)
          }
        }
      }
    }
    
    // 批量删除
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key)
      } catch (error) {
        console.error(`Failed to remove ${key}:`, error)
      }
    })
  }
  
  // 获取存储统计
  public getStats(): {
    totalKeys: number
    totalSize: number
    usedPercentage: number
    keysByType: Record<string, number>
  } {
    const stats = {
      totalKeys: 0,
      totalSize: 0,
      usedPercentage: 0,
      keysByType: {} as Record<string, number>
    }
    
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        stats.totalKeys++
        stats.totalSize += key.length + localStorage[key].length
        
        // 分类统计
        const type = key.split('-')[2] || 'other'
        stats.keysByType[type] = (stats.keysByType[type] || 0) + 1
      }
    }
    
    stats.usedPercentage = (stats.totalSize / (5 * 1024 * 1024)) * 100
    
    return stats
  }
}

// 导出单例
export const storageManager = new ImprovedStorageManager()

// 用于照片数据的特殊处理
export class PhotoStorageManager {
  private readonly MAX_PHOTO_SIZE = 500 * 1024 // 500KB per photo
  
  // 压缩图片
  private async compressImage(base64: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(base64)
          return
        }
        
        // 计算压缩尺寸
        const maxWidth = 1024
        const maxHeight = 1024
        let width = img.width
        let height = img.height
        
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height
            height = maxHeight
          }
        }
        
        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)
        
        // 转换为较低质量的 JPEG
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      }
      
      img.onerror = () => resolve(base64)
      img.src = base64
    })
  }
  
  // 保存照片组
  async savePhotoGroup(taskId: string, photoGroups: any[]): Promise<boolean> {
    try {
      // 压缩所有照片
      const compressedGroups = await Promise.all(
        photoGroups.map(async (group) => ({
          ...group,
          photos: await Promise.all(
            group.photos.map(async (photo: any) => ({
              ...photo,
              url: await this.compressImage(photo.url)
            }))
          )
        }))
      )
      
      return storageManager.setItem(
        `photo-collection-${taskId}`,
        compressedGroups,
        { expiryDays: 7 } // 7天后自动清理
      )
    } catch (error) {
      console.error('Failed to save photo group:', error)
      return false
    }
  }
  
  // 获取照片组
  getPhotoGroup(taskId: string): any[] | null {
    return storageManager.getItem(`photo-collection-${taskId}`)
  }
  
  // 删除照片组
  removePhotoGroup(taskId: string): void {
    storageManager.removeItem(`photo-collection-${taskId}`)
  }
}

export const photoStorage = new PhotoStorageManager()