// 优化的持久化状态 Hook
// 提供防抖、批量更新等性能优化

import { useState, useEffect, useRef, useCallback } from 'react'
import { storageManager } from '../utils/improvedStorageManager'

interface UsePersistedStateOptions {
  debounceMs?: number
  syncAcrossTabs?: boolean
  onError?: (error: Error) => void
}

export function usePersistedState<T>(
  key: string,
  initialValue: T,
  options: UsePersistedStateOptions = {}
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const {
    debounceMs = 500,
    syncAcrossTabs = true,
    onError
  } = options
  
  // 从 localStorage 加载初始值
  const [state, setState] = useState<T>(() => {
    try {
      const stored = storageManager.getItem<T>(key)
      return stored !== null ? stored : initialValue
    } catch (error) {
      onError?.(error as Error)
      return initialValue
    }
  })
  
  const timeoutRef = useRef<NodeJS.Timeout>()
  const pendingValueRef = useRef<T>(state)
  
  // 防抖保存
  const saveToStorage = useCallback((value: T) => {
    pendingValueRef.current = value
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      try {
        const success = storageManager.setItem(key, pendingValueRef.current)
        if (!success) {
          throw new Error('Failed to save to localStorage')
        }
      } catch (error) {
        onError?.(error as Error)
      }
    }, debounceMs)
  }, [key, debounceMs, onError])
  
  // 更新状态
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setState(prev => {
      const newValue = typeof value === 'function' 
        ? (value as (prev: T) => T)(prev)
        : value
      
      saveToStorage(newValue)
      return newValue
    })
  }, [saveToStorage])
  
  // 清除状态
  const clearValue = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    storageManager.removeItem(key)
    setState(initialValue)
  }, [key, initialValue])
  
  // 跨标签页同步
  useEffect(() => {
    if (!syncAcrossTabs) return
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `restaurant-ops-${key}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          if (parsed.value !== undefined) {
            setState(parsed.value)
          }
        } catch (error) {
          onError?.(error as Error)
        }
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [key, syncAcrossTabs, onError])
  
  // 清理
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])
  
  return [state, setValue, clearValue]
}

// 批量更新 Hook
export function useBatchedPersistence<T extends Record<string, any>>(
  key: string,
  initialValue: T
): {
  state: T
  updateField: (field: keyof T, value: any) => void
  updateMultiple: (updates: Partial<T>) => void
  save: () => Promise<boolean>
  reset: () => void
} {
  const [state, setState] = useState<T>(initialValue)
  const [hasChanges, setHasChanges] = useState(false)
  const pendingUpdates = useRef<Partial<T>>({})
  
  // 加载初始数据
  useEffect(() => {
    const stored = storageManager.getItem<T>(key)
    if (stored) {
      setState(stored)
    }
  }, [key])
  
  // 更新单个字段
  const updateField = useCallback((field: keyof T, value: any) => {
    pendingUpdates.current[field] = value
    setState(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }, [])
  
  // 批量更新
  const updateMultiple = useCallback((updates: Partial<T>) => {
    pendingUpdates.current = { ...pendingUpdates.current, ...updates }
    setState(prev => ({ ...prev, ...updates }))
    setHasChanges(true)
  }, [])
  
  // 保存到存储
  const save = useCallback(async (): Promise<boolean> => {
    if (!hasChanges) return true
    
    try {
      const success = storageManager.setItem(key, state)
      if (success) {
        pendingUpdates.current = {}
        setHasChanges(false)
      }
      return success
    } catch (error) {
      console.error('Failed to save:', error)
      return false
    }
  }, [key, state, hasChanges])
  
  // 重置
  const reset = useCallback(() => {
    setState(initialValue)
    pendingUpdates.current = {}
    setHasChanges(false)
    storageManager.removeItem(key)
  }, [key, initialValue])
  
  // 自动保存
  useEffect(() => {
    if (!hasChanges) return
    
    const timeout = setTimeout(() => {
      save()
    }, 2000) // 2秒后自动保存
    
    return () => clearTimeout(timeout)
  }, [hasChanges, save])
  
  // 页面卸载前保存
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasChanges) {
        save()
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasChanges, save])
  
  return {
    state,
    updateField,
    updateMultiple,
    save,
    reset
  }
}