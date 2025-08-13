// Face model loading status indicator
// Shows loading progress for face recognition models
// Created: 2025-08-13

import { useEffect, useState } from 'react'
import { Box, LinearProgress, Typography, Chip } from '@mui/material'
import { Check, Download, Error } from '@mui/icons-material'
import { faceModelManager } from '../../services/faceModelManager'

interface ModelStatus {
  tinyFaceDetector: boolean
  faceLandmark68Net: boolean
  faceRecognitionNet: boolean
  allLoaded: boolean
}

export const FaceModelStatus = () => {
  const [status, setStatus] = useState<ModelStatus>({
    tinyFaceDetector: false,
    faceLandmark68Net: false,
    faceRecognitionNet: false,
    allLoaded: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkStatus = () => {
      const currentStatus = faceModelManager.getModelStatus()
      setStatus(currentStatus)
      
      // Check if any model is loading
      const anyLoading = !currentStatus.allLoaded && 
        (currentStatus.tinyFaceDetector || 
         currentStatus.faceLandmark68Net || 
         currentStatus.faceRecognitionNet)
      
      setLoading(anyLoading)
    }

    // Initial check
    checkStatus()

    // Poll for updates while loading
    const interval = setInterval(checkStatus, 500)

    return () => clearInterval(interval)
  }, [])

  // Don't show if all models are loaded
  if (status.allLoaded && !error) {
    return null
  }

  const getProgress = () => {
    let loaded = 0
    if (status.tinyFaceDetector) loaded++
    if (status.faceLandmark68Net) loaded++
    if (status.faceRecognitionNet) loaded++
    return (loaded / 3) * 100
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        backgroundColor: 'background.paper',
        borderRadius: 2,
        boxShadow: 3,
        p: 2,
        minWidth: 250,
        zIndex: 1000
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        {loading ? (
          <Download sx={{ mr: 1, color: 'primary.main' }} />
        ) : error ? (
          <Error sx={{ mr: 1, color: 'error.main' }} />
        ) : (
          <Check sx={{ mr: 1, color: 'success.main' }} />
        )}
        <Typography variant="subtitle2">
          人脸识别模型
        </Typography>
      </Box>

      {loading && (
        <>
          <LinearProgress 
            variant="determinate" 
            value={getProgress()} 
            sx={{ mb: 1 }}
          />
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <Chip
              size="small"
              label="基础"
              color={status.tinyFaceDetector ? 'success' : 'default'}
              icon={status.tinyFaceDetector ? <Check /> : undefined}
            />
            <Chip
              size="small"
              label="特征"
              color={status.faceLandmark68Net ? 'success' : 'default'}
              icon={status.faceLandmark68Net ? <Check /> : undefined}
            />
            <Chip
              size="small"
              label="识别"
              color={status.faceRecognitionNet ? 'success' : 'default'}
              icon={status.faceRecognitionNet ? <Check /> : undefined}
            />
          </Box>
        </>
      )}

      {error && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}
    </Box>
  )
}