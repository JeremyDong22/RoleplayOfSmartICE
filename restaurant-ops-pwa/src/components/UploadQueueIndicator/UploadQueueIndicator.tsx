/**
 * Upload Queue Indicator Component
 * Shows the status of pending uploads and allows retry
 * 
 * Features:
 * - Shows count of pending uploads
 * - Displays upload progress
 * - Allows manual retry of failed uploads
 * - Network status indicator
 * 
 * Created: 2025-09-06
 */

import React, { useState, useEffect } from 'react'
import {
  Badge,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Button,
  Chip,
  Typography,
  Box,
  LinearProgress,
  Alert
} from '@mui/material'
import {
  CloudUpload,
  CloudOff,
  Refresh,
  Error as ErrorIcon,
  CheckCircle,
  HourglassEmpty,
  WifiOff,
  Wifi
} from '@mui/icons-material'
import { uploadQueueService, type QueuedUpload, UploadStatus } from '../../services/uploadQueueService'

export const UploadQueueIndicator: React.FC = () => {
  const [queue, setQueue] = useState<QueuedUpload[]>([])
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    // Load initial queue
    loadQueue()

    // Subscribe to queue updates
    const unsubscribe = uploadQueueService.subscribe((updatedQueue) => {
      setQueue(updatedQueue)
    })

    // Monitor network status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      unsubscribe()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const loadQueue = async () => {
    const uploads = await uploadQueueService.getQueuedUploads()
    setQueue(uploads)
  }

  const pendingUploads = queue.filter(u => 
    u.status === UploadStatus.PENDING || 
    u.status === UploadStatus.PARTIAL ||
    u.status === UploadStatus.UPLOADING
  )

  const failedUploads = queue.filter(u => u.status === UploadStatus.FAILED)

  const handleRetryAll = async () => {
    setProcessing(true)
    for (const upload of failedUploads) {
      await uploadQueueService.retryUpload(upload.id)
    }
    setProcessing(false)
  }

  const handleRetryOne = async (id: string) => {
    await uploadQueueService.retryUpload(id)
  }

  const handleClearCompleted = async () => {
    await uploadQueueService.clearCompleted()
    loadQueue()
  }

  const getStatusIcon = (status: UploadStatus) => {
    switch (status) {
      case UploadStatus.PENDING:
        return <HourglassEmpty color="action" />
      case UploadStatus.UPLOADING:
        return <CloudUpload color="primary" />
      case UploadStatus.PARTIAL:
        return <CloudUpload color="warning" />
      case UploadStatus.FAILED:
        return <ErrorIcon color="error" />
      case UploadStatus.COMPLETED:
        return <CheckCircle color="success" />
      default:
        return <HourglassEmpty />
    }
  }

  const getStatusLabel = (status: UploadStatus) => {
    switch (status) {
      case UploadStatus.PENDING:
        return '等待上传'
      case UploadStatus.UPLOADING:
        return '上传中'
      case UploadStatus.PARTIAL:
        return '部分完成'
      case UploadStatus.FAILED:
        return '上传失败'
      case UploadStatus.COMPLETED:
        return '已完成'
      default:
        return status
    }
  }

  if (pendingUploads.length === 0 && failedUploads.length === 0) {
    return null // Don't show indicator if queue is empty
  }

  return (
    <>
      <Tooltip title={`${pendingUploads.length} 个待上传任务`}>
        <Badge 
          badgeContent={pendingUploads.length + failedUploads.length} 
          color={failedUploads.length > 0 ? "error" : "primary"}
        >
          <IconButton 
            onClick={() => setDialogOpen(true)}
            color={isOnline ? "default" : "error"}
          >
            {isOnline ? <CloudUpload /> : <CloudOff />}
          </IconButton>
        </Badge>
      </Tooltip>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">上传队列</Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <Chip
                icon={isOnline ? <Wifi /> : <WifiOff />}
                label={isOnline ? '在线' : '离线'}
                color={isOnline ? 'success' : 'error'}
                size="small"
              />
              {failedUploads.length > 0 && (
                <Button
                  size="small"
                  startIcon={<Refresh />}
                  onClick={handleRetryAll}
                  disabled={processing || !isOnline}
                >
                  重试全部
                </Button>
              )}
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {!isOnline && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              当前离线，任务将在网络恢复后自动上传
            </Alert>
          )}

          {queue.length === 0 ? (
            <Typography color="text.secondary" align="center">
              暂无待上传任务
            </Typography>
          ) : (
            <List>
              {queue.map((upload) => (
                <ListItem key={upload.id}>
                  <ListItemIcon>
                    {getStatusIcon(upload.status)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box>
                        <Typography variant="body2">
                          任务 ID: {upload.taskId}
                        </Typography>
                        {upload.photos && (
                          <Typography variant="caption" color="text.secondary">
                            {upload.photos.filter(p => p.uploaded).length}/{upload.photos.length} 张照片已上传
                          </Typography>
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Chip 
                          label={getStatusLabel(upload.status)} 
                          size="small" 
                          sx={{ mt: 0.5 }}
                          color={
                            upload.status === UploadStatus.FAILED ? 'error' :
                            upload.status === UploadStatus.COMPLETED ? 'success' :
                            upload.status === UploadStatus.PARTIAL ? 'warning' :
                            'default'
                          }
                        />
                        {upload.error && (
                          <Typography variant="caption" color="error" display="block">
                            {upload.error}
                          </Typography>
                        )}
                        {upload.retryCount > 0 && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            重试次数: {upload.retryCount}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  {upload.status === UploadStatus.FAILED && (
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleRetryOne(upload.id)}
                        disabled={!isOnline}
                      >
                        <Refresh />
                      </IconButton>
                    </ListItemSecondaryAction>
                  )}
                  {upload.status === UploadStatus.UPLOADING && (
                    <Box sx={{ width: '100%', mt: 1 }}>
                      <LinearProgress />
                    </Box>
                  )}
                </ListItem>
              ))}
            </List>
          )}

          {queue.some(u => u.status === UploadStatus.COMPLETED) && (
            <Box mt={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleClearCompleted}
              >
                清除已完成任务
              </Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}