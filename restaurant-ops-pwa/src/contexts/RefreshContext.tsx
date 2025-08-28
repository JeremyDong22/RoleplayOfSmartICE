/**
 * Refresh Context for Global Refresh Management
 * Created: 2025-08-27
 * Purpose: Manages global refresh state and allows pages to register refresh callbacks
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

interface RefreshContextType {
  isRefreshing: boolean
  error: string | null
  lastRefreshTime: number | null
  triggerRefresh: () => Promise<void>
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
  const triggerRefresh = useCallback(async () => {
    if (isRefreshing) return
    
    setIsRefreshing(true)
    setError(null)
    
    try {
      // Execute all registered refresh callbacks in parallel
      const promises = Array.from(refreshCallbacks.current).map(callback => callback())
      
      if (promises.length === 0) {
        // If no callbacks registered, just simulate a refresh
        await new Promise(resolve => setTimeout(resolve, 1000))
      } else {
        await Promise.all(promises)
      }
      
      setLastRefreshTime(Date.now())
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