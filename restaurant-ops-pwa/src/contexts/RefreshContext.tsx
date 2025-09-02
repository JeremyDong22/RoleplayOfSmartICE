/**
 * Refresh Context for Global Refresh Management
 * Created: 2025-08-27
 * Updated: 2025-09-02 - Added soft/hard refresh capabilities
 * Purpose: Manages global refresh state and allows pages to register refresh callbacks
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { clearAllCaches, APP_VERSION } from '../utils/cacheManager'
import { taskService } from '../services/taskService'
import { supabase } from '../services/supabase'

interface RefreshContextType {
  isRefreshing: boolean
  error: string | null
  lastRefreshTime: number | null
  triggerRefresh: (type?: 'soft' | 'hard') => Promise<void>
  registerRefreshCallback: (callback: () => Promise<void>) => () => void
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined)

interface RefreshProviderProps {
  children: React.ReactNode
}

export const RefreshProvider: React.FC<RefreshProviderProps> = ({ children }) => {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null)
  
  // Store multiple refresh callbacks for different components
  const refreshCallbacks = useRef<Set<() => Promise<void>>>(new Set())

  // Register a refresh callback from a component
  const registerRefreshCallback = useCallback((callback: () => Promise<void>) => {
    refreshCallbacks.current.add(callback)
    
    // Return cleanup function
    return () => {
      refreshCallbacks.current.delete(callback)
    }
  }, [])

  // Trigger refresh for all registered callbacks
  const triggerRefresh = useCallback(async (type: 'soft' | 'hard' = 'soft') => {
    if (isRefreshing) return
    
    setIsRefreshing(true)
    setError(null)
    
    try {
      if (type === 'hard') {
        // 硬刷新：清理所有缓存并更新版本
        console.log('[RefreshContext] Performing hard refresh...')
        
        // 1. 清理所有缓存
        await clearAllCaches()
        
        // 2. 更新版本号强制刷新
        const newVersion = APP_VERSION + '-' + Date.now()
        localStorage.setItem('app_version', newVersion)
        
        // 3. 清理 Supabase 缓存
        localStorage.removeItem('supabase.auth.token')
        sessionStorage.clear()
        
        // 4. 发送消息给 Service Worker 强制更新
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'FORCE_REFRESH',
            action: 'clearAllCaches'
          })
        }
        
        // 5. 等待一小段时间让清理完成
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // 6. 强制页面重载
        window.location.reload()
        return // 页面会重载，不需要继续执行
      }
      
      // 软刷新：重新加载数据但不清理缓存
      console.log('[RefreshContext] Performing soft refresh...')
      
      // 1. 重新初始化核心服务
      const reinitPromises = []
      
      // 重新初始化 TaskService
      if (taskService) {
        reinitPromises.push(
          taskService.initialize().catch(err => {
            console.error('[RefreshContext] Failed to reinitialize TaskService:', err)
          })
        )
      }
      
      // 2. 执行所有注册的刷新回调
      const callbacks = Array.from(refreshCallbacks.current)
      
      if (callbacks.length > 0) {
        reinitPromises.push(...callbacks.map(callback => 
          callback().catch(err => {
            console.error('[RefreshContext] Callback error:', err)
          })
        ))
      }
      
      // 3. 如果没有回调，至少刷新页面数据
      if (callbacks.length === 0) {
        // 触发一个自定义事件，让页面知道需要刷新
        window.dispatchEvent(new CustomEvent('app-refresh', { detail: { type: 'soft' } }))
        
        // 等待一小段时间模拟刷新
        reinitPromises.push(new Promise(resolve => setTimeout(resolve, 1000)))
      }
      
      await Promise.all(reinitPromises)
      
      setLastRefreshTime(Date.now())
      console.log('[RefreshContext] Soft refresh completed')
    } catch (err) {
      console.error('Refresh error:', err)
      setError(err instanceof Error ? err.message : '刷新失败')
      throw err
    } finally {
      setIsRefreshing(false)
    }
  }, [isRefreshing])

  const value = {
    isRefreshing,
    error,
    lastRefreshTime,
    triggerRefresh,
    registerRefreshCallback
  }

  return (
    <RefreshContext.Provider value={value}>
      {children}
    </RefreshContext.Provider>
  )
}

// Custom hook to use the refresh context
export const useRefresh = () => {
  const context = useContext(RefreshContext)
  if (context === undefined) {
    throw new Error('useRefresh must be used within a RefreshProvider')
  }
  return context
}

// Custom hook for components to register their refresh logic
export const useRefreshable = (refreshCallback: () => Promise<void>, deps: React.DependencyList = []) => {
  const { registerRefreshCallback } = useRefresh()
  
  React.useEffect(() => {
    const cleanup = registerRefreshCallback(refreshCallback)
    return cleanup
  }, deps)
}