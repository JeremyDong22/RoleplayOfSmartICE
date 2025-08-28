/**
 * Global Refresh Floating Action Button Component
 * Created: 2025-08-27
 * Purpose: Provides a unified refresh button with beautiful animations for all pages
 */

import React, { useState, useEffect } from 'react'
import { Fab, Zoom, Box, keyframes, Snackbar, Alert } from '@mui/material'
import { Refresh as RefreshIcon, Check as CheckIcon } from '@mui/icons-material'
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

  // Handle refresh click
  const handleRefresh = async () => {
    if (isRefreshing || isAnimating) return
    
    setIsAnimating(true)
    setShowSuccess(false)
    setShowError(false)
    
    try {
      await triggerRefresh()
      // Show success state
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        setIsAnimating(false)
      }, 1500)
    } catch (err) {
      // Show error state
      setShowError(true)
      setTimeout(() => {
        setShowError(false)
        setIsAnimating(false)
      }, 2000)
    }
  }

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
    return <RefreshIcon />
  }

  // Determine button color
  const getColor = () => {
    if (showSuccess) return 'success'
    if (showError) return 'error'
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
          <Fab
            color={getColor()}
            size={size}
            onClick={handleRefresh}
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
              }
            }}
            aria-label="刷新页面"
          >
            {getIcon()}
          </Fab>
          
          {/* Show last refresh time on hover */}
          {timeSinceRefresh && !isRefreshing && !isAnimating && (
            <Box
              sx={{
                position: 'absolute',
                bottom: '100%',
                right: 0,
                mb: 1,
                px: 1.5,
                py: 0.5,
                bgcolor: 'grey.800',
                color: 'white',
                borderRadius: 1,
                fontSize: '0.75rem',
                whiteSpace: 'nowrap',
                opacity: 0,
                pointerEvents: 'none',
                transition: 'opacity 0.3s',
                '&:hover': {
                  opacity: 0
                },
                '.MuiFab-root:hover + &': {
                  opacity: 0.9
                }
              }}
            >
              {timeSinceRefresh}
            </Box>
          )}
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