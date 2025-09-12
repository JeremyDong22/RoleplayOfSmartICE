/**
 * Global Refresh Floating Action Button Component
 * Created: 2025-08-27
 * Updated: 2025-09-02 - Added short press (soft refresh) and long press (hard refresh)
 * Updated: 2025-09-04 - Changed short press to hard refresh, long press to complete cache clear
 * Purpose: Provides a unified refresh button with beautiful animations for all pages
 */

import React, { useState, useEffect, useRef } from 'react'
import { Fab, Zoom, Box, keyframes, Snackbar, Alert, CircularProgress, Tooltip } from '@mui/material'
import { Refresh as RefreshIcon, Check as CheckIcon, Cached as CachedIcon } from '@mui/icons-material'
import { useRefresh } from '../../contexts/RefreshContext'

// Define rotation animation
const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`

// Define pulse animation for loading state
const pulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(25, 118, 210, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0);
  }
`

// Define shake animation for error state
const shake = keyframes`
  0%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-2px);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(2px);
  }
`

interface GlobalRefreshButtonProps {
  position?: {
    bottom?: number
    right?: number
    left?: number
    top?: number
  }
  size?: 'small' | 'medium' | 'large'
  hideWhenLoading?: boolean
}

export const GlobalRefreshButton: React.FC<GlobalRefreshButtonProps> = ({
  position = { bottom: 80, right: 16 }, // Default position above navigation bar
  size = 'medium',
  hideWhenLoading = false
}) => {
  const { isRefreshing, error, triggerRefresh, lastRefreshTime } = useRefresh()
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isLongPress, setIsLongPress] = useState(false)
  const [longPressProgress, setLongPressProgress] = useState(0)
  const [showTooltip, setShowTooltip] = useState(false)
  const [successMessage, setSuccessMessage] = useState('刷新成功')
  const [showInitialTooltip, setShowInitialTooltip] = useState(true) // 控制初始提示显示
  
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartTimeRef = useRef<number>(0)

  // Handle mouse/touch down - start detecting long press
  const handlePressStart = () => {
    if (isRefreshing || isAnimating) return
    
    touchStartTimeRef.current = Date.now()
    setLongPressProgress(0.1) // 设置初始值让进度条立即显示
    
    // Start progress animation
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - touchStartTimeRef.current
      const progress = Math.min((elapsed / 2000) * 100, 100) // 2秒长按
      setLongPressProgress(progress)
      
      if (progress >= 100) {
        clearInterval(progressIntervalRef.current!)
        progressIntervalRef.current = null
      }
    }, 16) // 60fps update
    
    // Set timer for long press detection (2 seconds)
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPress(true)
      // Vibrate feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100])
      }
      // Show tooltip
      setShowTooltip(true)
    }, 2000)
  }

  // Handle mouse/touch up - execute appropriate refresh
  const handlePressEnd = async () => {
    // Clear timers
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    
    const pressDuration = Date.now() - touchStartTimeRef.current
    
    if (isRefreshing || isAnimating) {
      setLongPressProgress(0)
      setIsLongPress(false)
      setShowTooltip(false)
      return
    }
    
    setIsAnimating(true)
    setShowSuccess(false)
    setShowError(false)
    setShowTooltip(false)
    
    try {
      if (isLongPress || pressDuration >= 2000) {
        // 长按：彻底清理（更武断的清理方式）
        console.log('执行彻底清理...')
        
        // 清理 localStorage
        localStorage.clear()
        
        // 清理 sessionStorage
        sessionStorage.clear()
        
        // 清理 IndexedDB
        if ('indexedDB' in window) {
          const databases = await indexedDB.databases?.() || []
          for (const db of databases) {
            if (db.name) {
              try {
                await indexedDB.deleteDatabase(db.name)
                console.log(`Deleted IndexedDB: ${db.name}`)
              } catch (err) {
                console.error(`Failed to delete IndexedDB ${db.name}:`, err)
              }
            }
          }
        }
        
        // 清理所有 cookies
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
        })
        
        // 清理所有 cache storage
        if ('caches' in window) {
          const cacheNames = await caches.keys()
          await Promise.all(
            cacheNames.map(cacheName => {
              console.log(`Deleting cache: ${cacheName}`)
              return caches.delete(cacheName)
            })
          )
        }
        
        // 注销所有 service workers
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations()
          for (const registration of registrations) {
            await registration.unregister()
            console.log('Unregistered service worker')
          }
        }
        
        // 显示成功消息并重定向到首页
        setSuccessMessage('缓存已彻底清理，页面即将刷新...')
        setShowSuccess(true)
        setTimeout(() => {
          window.location.href = '/'
          window.location.reload()
        }, 1500)
        
      } else {
        // 短按：硬刷新（强制页面重载）- 移除时长限制，立即响应
        console.log('执行硬刷新...')
        setSuccessMessage('正在刷新页面...')
        setShowSuccess(true)
        
        // 设置一个超时，确保即使刷新失败按钮也能恢复
        setTimeout(() => {
          setIsAnimating(false)
        }, 1000) // 缩短到1秒
        
        try {
          await triggerRefresh('hard')
          // 硬刷新会重载页面，通常不会执行到这里
        } catch (err) {
          console.error('硬刷新失败，尝试直接重载页面:', err)
          // 如果 triggerRefresh 失败，立即重载页面
          window.location.reload() // 移除延迟，立即重载
        }
      }
    } catch (err) {
      console.error('刷新失败:', err)
      // Show error state
      setShowError(true)
      setTimeout(() => {
        setShowError(false)
        setIsAnimating(false)
      }, 2000)
    } finally {
      setLongPressProgress(0)
      setIsLongPress(false)
      // 确保在任何情况下都重置动画状态（如果没有成功或错误状态）
      if (!showSuccess && !showError) {
        setTimeout(() => {
          setIsAnimating(false)
        }, 500)
      }
    }
  }

  // Handle press cancel (mouse leave or touch cancel)
  const handlePressCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    setLongPressProgress(0)
    setIsLongPress(false)
    setShowTooltip(false)
  }

  // Hide initial tooltip after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowInitialTooltip(false)
    }, 2000) // 2秒后自动隐藏提示
    
    return () => clearTimeout(timer)
  }, []) // 只在组件挂载时执行一次
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [])

  // Show error snackbar when error occurs
  useEffect(() => {
    if (error) {
      setShowError(true)
    }
  }, [error])

  // Determine icon to show
  const getIcon = () => {
    if (showSuccess) {
      return <CheckIcon />
    }
    if (isLongPress) {
      return <CachedIcon /> // 显示不同图标表示彻底清理
    }
    return <RefreshIcon />
  }

  // Determine button color
  const getColor = () => {
    if (showSuccess) return 'success'
    if (showError) return 'error'
    if (isLongPress) return 'secondary' // 长按时显示不同颜色，警示更强烈的操作
    return 'primary'
  }

  // Apply animations based on state
  const getAnimation = () => {
    if (isRefreshing) {
      return {
        animation: `${rotate} 1s linear infinite, ${pulse} 1.5s ease-out infinite`
      }
    }
    if (showError) {
      return {
        animation: `${shake} 0.5s ease-in-out`
      }
    }
    if (isAnimating && !showSuccess && !showError) {
      return {
        animation: `${rotate} 0.6s ease-in-out`
      }
    }
    return {}
  }

  // Calculate time since last refresh
  const getTimeSinceRefresh = () => {
    if (!lastRefreshTime) return null
    const now = Date.now()
    const diff = now - lastRefreshTime
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return '刚刚更新'
    if (minutes < 60) return `${minutes}分钟前更新`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}小时前更新`
    return '超过1天未更新'
  }

  const timeSinceRefresh = getTimeSinceRefresh()

  return (
    <>
      <Zoom in={!hideWhenLoading || !isRefreshing}>
        <Box
          sx={{
            position: 'fixed',
            ...position,
            zIndex: 1200
          }}
        >
          <Tooltip
            title={isLongPress ? "松开执行彻底清理（清除所有缓存和存储）" : "点击刷新页面，长按2秒彻底清理所有缓存"}
            open={showTooltip || (showInitialTooltip && !isRefreshing && !isAnimating)}
            placement="top"
          >
            <Box sx={{ position: 'relative' }}>
              {/* Progress indicator for long press */}
              {longPressProgress > 0 && longPressProgress < 100 && (
                <CircularProgress
                  variant="determinate"
                  value={longPressProgress}
                  size={size === 'small' ? 40 : size === 'large' ? 68 : 56}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: 1,
                    color: 'secondary.main',
                    opacity: 0.7
                  }}
                />
              )}
              
              <Fab
                color={getColor()}
                size={size}
                onMouseDown={handlePressStart}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressCancel}
                onTouchStart={handlePressStart}
                onTouchEnd={handlePressEnd}
                onTouchCancel={handlePressCancel}
                disabled={isRefreshing || isAnimating}
                sx={{
                  ...getAnimation(),
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'scale(1.1)',
                    boxShadow: 3
                  },
                  '&:active': {
                    transform: 'scale(0.95)'
                  },
                  ...(isLongPress && {
                    transform: 'scale(1.15)',
                    boxShadow: 6
                  })
                }}
                aria-label={isLongPress ? "彻底清理所有缓存和存储" : "硬刷新页面"}
              >
                {getIcon()}
              </Fab>
            </Box>
          </Tooltip>
          
        </Box>
      </Zoom>

      {/* Error notification */}
      <Snackbar
        open={showError && !!error}
        autoHideDuration={3000}
        onClose={() => setShowError(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setShowError(false)}>
          刷新失败：{error || '网络错误，请重试'}
        </Alert>
      </Snackbar>
    </>
  )
}