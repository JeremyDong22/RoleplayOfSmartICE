/**
 * Upload Progress Component
 * 
 * Displays upload progress with clear status feedback
 * Provides retry and cancel options for better UX
 * Optimized for mobile devices with Huawei compatibility
 * 
 * Created: 2025-08-05
 */

import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  LinearProgress,
  Button,
  IconButton,
  Alert,
  Chip,
  Stack
} from '@mui/material'
import {
  CloudUpload,
  CheckCircle,
  Error as ErrorIcon,
  Refresh,
  Close,
  CloudQueue,
  CloudDone,
  CloudOff
} from '@mui/icons-material'

export interface UploadItem {
  id: string
  name: string
  size?: number
  status: 'pending' | 'uploading' | 'success' | 'error' | 'retrying'
  progress?: number
  error?: string
  retryCount?: number
}

interface UploadProgressProps {
  open: boolean
  items: UploadItem[]
  totalProgress?: number
  onClose?: () => void
  onRetry?: (itemId: string) => void
  onCancel?: () => void
  autoClose?: boolean
  autoCloseDelay?: number
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  open,
  items,
  totalProgress = 0,
  onClose,
  onRetry,
  onCancel,
  autoClose = true,
  autoCloseDelay = 3000
}) => {
  const [shouldClose, setShouldClose] = useState(false)
  
  // Calculate statistics
  const totalItems = items.length
  const uploadedItems = items.filter(item => item.status === 'success').length
  const failedItems = items.filter(item => item.status === 'error').length
  const uploadingItems = items.filter(item => item.status === 'uploading').length
  const isComplete = uploadedItems === totalItems
  const hasErrors = failedItems > 0
  
  // Auto close when all uploads are successful
  useEffect(() => {
    if (isComplete && autoClose && !hasErrors) {
      const timer = setTimeout(() => {
        setShouldClose(true)
        onClose?.()
      }, autoCloseDelay)
      
      return () => clearTimeout(timer)
    }
  }, [isComplete, hasErrors, autoClose, autoCloseDelay, onClose])
  
  // Get status icon
  const getStatusIcon = (status: UploadItem['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle color="success" fontSize="small" />
      case 'error':
        return <ErrorIcon color="error" fontSize="small" />
      case 'uploading':
      case 'retrying':
        return <CloudUpload color="primary" fontSize="small" />
      case 'pending':
      default:
        return <CloudQueue color="disabled" fontSize="small" />
    }
  }
  
  // Get status color
  const getStatusColor = (status: UploadItem['status']): 'default' | 'primary' | 'success' | 'error' | 'warning' => {
    switch (status) {
      case 'success':
        return 'success'
      case 'error':
        return 'error'
      case 'uploading':
        return 'primary'
      case 'retrying':
        return 'warning'
      default:
        return 'default'
    }
  }
  
  // Format file size
  const formatSize = (bytes?: number): string => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  
  // Get overall status message
  const getStatusMessage = () => {
    if (isComplete && !hasErrors) {
      return '所有文件上传成功！'
    }
    if (uploadingItems > 0) {
      return `正在上传 ${uploadingItems} 个文件...`
    }
    if (hasErrors && uploadedItems === 0) {
      return '上传失败，请重试'
    }
    if (hasErrors) {
      return `${uploadedItems} 个成功，${failedItems} 个失败`
    }
    return '准备上传...'
  }
  
  return (
    <Dialog
      open={open && !shouldClose}
      onClose={isComplete ? onClose : undefined}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: 300
        }
      }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isComplete && !hasErrors ? (
              <>
                <CloudDone color="success" />
                上传完成
              </>
            ) : hasErrors && uploadingItems === 0 ? (
              <>
                <CloudOff color="error" />
                上传失败
              </>
            ) : (
              <>
                <CloudUpload color="primary" />
                正在上传
              </>
            )}
          </Typography>
          {(isComplete || hasErrors) && (
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          )}
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {getStatusMessage()}
        </Typography>
        
        {/* Overall progress */}
        {!isComplete && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                总进度
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {uploadedItems}/{totalItems} 完成
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={(uploadedItems / totalItems) * 100}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        )}
      </Box>
      
      <DialogContent>
        <Stack spacing={2}>
          {/* Individual file progress */}
          {items.map((item) => (
            <Box
              key={item.id}
              sx={{
                p: 2,
                borderRadius: 1,
                bgcolor: 'background.paper',
                border: 1,
                borderColor: item.status === 'error' ? 'error.main' : 'divider',
                position: 'relative'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                {getStatusIcon(item.status)}
                <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
                  {item.name}
                </Typography>
                {item.size && (
                  <Typography variant="caption" color="text.secondary">
                    {formatSize(item.size)}
                  </Typography>
                )}
              </Box>
              
              {/* Progress bar for uploading items */}
              {(item.status === 'uploading' || item.status === 'retrying') && (
                <Box sx={{ mt: 1 }}>
                  <LinearProgress
                    variant={item.progress !== undefined ? 'determinate' : 'indeterminate'}
                    value={item.progress || 0}
                    sx={{ height: 4, borderRadius: 2 }}
                  />
                  {item.progress !== undefined && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                      {Math.round(item.progress)}%
                    </Typography>
                  )}
                </Box>
              )}
              
              {/* Status chip */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <Chip
                  label={
                    item.status === 'success' ? '上传成功' :
                    item.status === 'error' ? '上传失败' :
                    item.status === 'uploading' ? '上传中' :
                    item.status === 'retrying' ? `重试中 (${item.retryCount || 1})` :
                    '等待上传'
                  }
                  size="small"
                  color={getStatusColor(item.status)}
                  variant={item.status === 'pending' ? 'outlined' : 'filled'}
                />
                
                {/* Retry button for failed items */}
                {item.status === 'error' && onRetry && (
                  <Button
                    size="small"
                    startIcon={<Refresh />}
                    onClick={() => onRetry(item.id)}
                    color="primary"
                  >
                    重试
                  </Button>
                )}
              </Box>
              
              {/* Error message */}
              {item.error && (
                <Alert severity="error" sx={{ mt: 1, py: 0.5 }}>
                  <Typography variant="caption">{item.error}</Typography>
                </Alert>
              )}
            </Box>
          ))}
        </Stack>
        
        {/* Action buttons */}
        {(hasErrors || !isComplete) && (
          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            {hasErrors && failedItems > 0 && onRetry && (
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={() => {
                  items
                    .filter(item => item.status === 'error')
                    .forEach(item => onRetry(item.id))
                }}
              >
                重试全部失败
              </Button>
            )}
            
            {!isComplete && onCancel && (
              <Button
                variant="outlined"
                color="error"
                onClick={onCancel}
              >
                取消上传
              </Button>
            )}
            
            {isComplete && (
              <Button
                variant="contained"
                onClick={onClose}
              >
                完成
              </Button>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default UploadProgress