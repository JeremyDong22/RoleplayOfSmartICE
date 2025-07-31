// Hook for integrating daily cleanup with the app
// 与现有的门店关闭逻辑协同工作

import { useEffect, useState, useCallback } from 'react'
import { dailyCleanupScheduler } from '../utils/dailyCleanupScheduler'

interface CleanupStatus {
  isScheduled: boolean
  nextCleanupTime: Date | null
  lastCleanupTime: Date | null
  lastCleanupStats: {
    localStorageCleared: number
    photosDeleted: number
    errors: number
  } | null
}

export function useDailyCleanup() {
  const [status, setStatus] = useState<CleanupStatus>({
    isScheduled: false,
    nextCleanupTime: null,
    lastCleanupTime: null,
    lastCleanupStats: null
  })
  
  // 启动清理调度器
  useEffect(() => {
    // 启动调度器
    dailyCleanupScheduler.start()
    
    // 更新状态
    updateStatus()
    
    // 监听清理完成事件
    const handleCleanupComplete = (event: CustomEvent) => {
      console.log('[useDailyCleanup] Cleanup completed:', event.detail)
      updateStatus()
      
      // 可以在这里显示通知
      if (event.detail.errors.length === 0) {
        // 成功清理通知
        console.log('✅ 每日数据清理完成')
      } else {
        // 清理有错误
        console.warn('⚠️ 数据清理完成但有错误:', event.detail.errors)
      }
    }
    
    window.addEventListener('daily-cleanup-complete', handleCleanupComplete as EventListener)
    
    // 每分钟更新一次状态（显示倒计时）
    const interval = setInterval(updateStatus, 60000)
    
    return () => {
      dailyCleanupScheduler.stop()
      window.removeEventListener('daily-cleanup-complete', handleCleanupComplete as EventListener)
      clearInterval(interval)
    }
  }, [])
  
  // 更新状态
  const updateStatus = useCallback(() => {
    const schedulerStatus = dailyCleanupScheduler.getStatus()
    
    setStatus({
      isScheduled: schedulerStatus.isRunning,
      nextCleanupTime: schedulerStatus.nextCleanupTime,
      lastCleanupTime: schedulerStatus.lastCleanupResult?.timestamp || null,
      lastCleanupStats: schedulerStatus.lastCleanupResult ? {
        localStorageCleared: schedulerStatus.lastCleanupResult.localStorageCleared.length,
        photosDeleted: schedulerStatus.lastCleanupResult.photosDeleted,
        errors: schedulerStatus.lastCleanupResult.errors.length
      } : null
    })
  }, [])
  
  // 手动触发清理
  const triggerManualCleanup = useCallback(async () => {
    console.log('[useDailyCleanup] Triggering manual cleanup')
    
    const confirmed = window.confirm(
      '确定要立即清理所有数据吗？\n\n' +
      '这将会：\n' +
      '• 清除所有任务记录\n' +
      '• 删除所有未上传的照片\n' +
      '• 重置任务状态\n\n' +
      '此操作不可撤销！'
    )
    
    if (!confirmed) return
    
    try {
      const result = await dailyCleanupScheduler.triggerManualCleanup()
      updateStatus()
      
      alert(
        `清理完成！\n\n` +
        `• 清理了 ${result.localStorageCleared.length} 个存储项\n` +
        `• 删除了 ${result.photosDeleted} 张照片\n` +
        `${result.errors.length > 0 ? `• 错误: ${result.errors.join(', ')}` : ''}`
      )
    } catch (error) {
      console.error('[useDailyCleanup] Manual cleanup failed:', error)
      alert('清理失败，请查看控制台了解详情')
    }
  }, [updateStatus])
  
  // 获取下次清理的倒计时
  const getTimeUntilNextCleanup = useCallback(() => {
    if (!status.nextCleanupTime) return null
    
    const now = new Date()
    const diff = status.nextCleanupTime.getTime() - now.getTime()
    
    if (diff <= 0) return '即将开始...'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    return `${hours}小时${minutes}分钟`
  }, [status.nextCleanupTime])
  
  return {
    status,
    triggerManualCleanup,
    getTimeUntilNextCleanup
  }
}

// 用于显示清理状态的组件
export function CleanupStatusDisplay() {
  const { status, getTimeUntilNextCleanup } = useDailyCleanup()
  
  if (!status.isScheduled) return null
  
  return (
    <div style={{ 
      padding: '10px', 
      background: '#f0f0f0', 
      borderRadius: '5px',
      fontSize: '12px'
    }}>
      <div>🧹 自动清理已启用</div>
      <div>下次清理: 明天早上8:00 ({getTimeUntilNextCleanup()})</div>
      {status.lastCleanupTime && (
        <div>
          上次清理: {status.lastCleanupTime.toLocaleString()}
          {status.lastCleanupStats && (
            <span>
              (清理{status.lastCleanupStats.localStorageCleared}项, 
              删除{status.lastCleanupStats.photosDeleted}张照片)
            </span>
          )}
        </div>
      )}
    </div>
  )
}