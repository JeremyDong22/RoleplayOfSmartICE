// Component to display face recognition model loading status
// Shows cache status, loading progress, and network connectivity
// Created: 2025-08-15 - Provides user feedback for model loading issues

import React, { useEffect, useState } from 'react'
import { Alert, LinearProgress, Box, Typography, Button } from '@mui/material'
import { faceModelManager } from '../../services/faceModelManager'
import WifiOffIcon from '@mui/icons-material/WifiOff'
import CloudDownloadIcon from '@mui/icons-material/CloudDownload'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RefreshIcon from '@mui/icons-material/Refresh'

interface ModelStatus {
  cached: boolean
  loaded: boolean
  loading: boolean
  error: string | null
  progress: number
  message: string
  isOnline: boolean
}

export const FaceModelStatus: React.FC = () => {
  const [status, setStatus] = useState<ModelStatus>({
    cached: false,
    loaded: false,
    loading: false,
    error: null,
    progress: 0,
    message: '检查模型状态...',
    isOnline: navigator.onLine
  })
  
  const [showStatus, setShowStatus] = useState(true)
  
  useEffect(() => {
    checkModelStatus()
    
    // Listen for online/offline events
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true }))
      if (!status.loaded && !status.loading) {
        loadModels()
      }
    }
    
    const handleOffline = () => {
      setStatus(prev => ({ ...prev, isOnline: false }))
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  
  const checkModelStatus = async () => {
    // Check if models are cached
    if ('caches' in window) {
      try {
        const cache = await caches.open('face-models-v2')
        const modelFiles = [
          '/models/tiny_face_detector_model-weights_manifest.json',
          '/models/tiny_face_detector_model-shard1.bin',
          '/models/face_landmark_68_model-weights_manifest.json',
          '/models/face_landmark_68_model-shard1.bin',
          '/models/face_recognition_model-weights_manifest.json',
          '/models/face_recognition_model-shard1.bin',
          '/models/face_recognition_model-shard2.bin'
        ]
        
        const cacheChecks = await Promise.all(
          modelFiles.map(url => cache.match(url))
        )
        
        const allCached = cacheChecks.every(response => response !== undefined)
        
        setStatus(prev => ({
          ...prev,
          cached: allCached,
          message: allCached ? '模型已缓存' : '模型未缓存'
        }))
        
        // Check if models are loaded
        const modelStatus = faceModelManager.getModelStatus()
        if (modelStatus.allLoaded) {
          setStatus(prev => ({
            ...prev,
            loaded: true,
            loading: false,
            message: '模型已就绪',
            progress: 100
          }))
        } else if (!status.loading) {
          // Auto-load models
          loadModels()
        }
      } catch (error) {
        console.error('Error checking model cache:', error)
      }
    }
  }
  
  const loadModels = async () => {
    setStatus(prev => ({
      ...prev,
      loading: true,
      error: null,
      message: '正在加载模型...'
    }))
    
    // Set progress callback
    faceModelManager.setProgressCallback((message, progress) => {
      setStatus(prev => ({
        ...prev,
        message,
        progress
      }))
    })
    
    try {
      await faceModelManager.initialize()
      
      setStatus(prev => ({
        ...prev,
        loaded: true,
        loading: false,
        error: null,
        message: '模型加载完成',
        progress: 100
      }))
      
      // Hide status after successful load
      setTimeout(() => {
        setShowStatus(false)
      }, 3000)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '模型加载失败'
      setStatus(prev => ({
        ...prev,
        loaded: false,
        loading: false,
        error: errorMessage,
        message: errorMessage,
        progress: 0
      }))
    }
  }
  
  const handleRetry = () => {
    loadModels()
  }
  
  const handleClearCache = async () => {
    if ('caches' in window) {
      try {
        await caches.delete('face-models-v2')
        setStatus(prev => ({
          ...prev,
          cached: false,
          message: '缓存已清除，请重新加载'
        }))
        // Reload after clearing cache
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } catch (error) {
        console.error('Error clearing cache:', error)
      }
    }
  }
  
  if (!showStatus && status.loaded) {
    return null
  }
  
  const getSeverity = () => {
    if (status.error) return 'error'
    if (!status.isOnline && !status.cached) return 'warning'
    if (status.loaded) return 'success'
    if (status.loading) return 'info'
    return 'info'
  }
  
  const getIcon = () => {
    if (!status.isOnline) return <WifiOffIcon />
    if (status.loaded) return <CheckCircleIcon />
    if (status.loading) return <CloudDownloadIcon />
    return null
  }
  
  return (
    <Box sx={{ position: 'fixed', top: 70, right: 20, zIndex: 1000, maxWidth: 400 }}>
      <Alert 
        severity={getSeverity()}
        icon={getIcon()}
        action={
          status.error ? (
            <Button color="inherit" size="small" onClick={handleRetry}>
              <RefreshIcon sx={{ mr: 0.5 }} />
              重试
            </Button>
          ) : status.cached && !status.loaded ? (
            <Button color="inherit" size="small" onClick={handleClearCache}>
              清除缓存
            </Button>
          ) : null
        }
      >
        <Typography variant="body2">
          {status.message}
        </Typography>
        
        {status.loading && (
          <Box sx={{ mt: 1 }}>
            <LinearProgress variant="determinate" value={status.progress} />
            <Typography variant="caption" color="text.secondary">
              {Math.round(status.progress)}%
            </Typography>
          </Box>
        )}
        
        {!status.isOnline && !status.cached && (
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            ⚠️ 首次使用需要网络连接下载模型（约7MB）
          </Typography>
        )}
        
        {status.cached && !status.isOnline && (
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            ✅ 已启用离线模式
          </Typography>
        )}
      </Alert>
    </Box>
  )
}