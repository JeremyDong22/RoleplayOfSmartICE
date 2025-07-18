// Post Upload Modal - Upload task completion evidence
// Created: Allows employees and managers to upload photos and text for task verification
import React, { useState, useRef } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Alert,
  CircularProgress,
  Chip,
  SelectChangeEvent
} from '@mui/material'
import {
  Close as CloseIcon,
  PhotoCamera,
  Delete as DeleteIcon,
  CloudUpload
} from '@mui/icons-material'
import { TaskTemplate } from '../../utils/workflowParser'
import { addPost } from '../../utils/taskPoolManager'

interface PostUploadModalProps {
  open: boolean
  onClose: () => void
  tasks: TaskTemplate[]
  currentPeriodId: string
  currentRole: 'manager' | 'chef' | 'front-employee' | 'kitchen-employee'
  department: '前厅' | '后厨'
}

export const PostUploadModal: React.FC<PostUploadModalProps> = ({
  open,
  onClose,
  tasks,
  currentPeriodId,
  currentRole,
  department
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string>('')
  const [photos, setPhotos] = useState<string[]>([])
  const [text, setText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get regular tasks (non-notices) for selection
  const selectableTasks = tasks.filter(t => !t.isNotice)

  const handleTaskSelect = (event: SelectChangeEvent) => {
    setSelectedTaskId(event.target.value)
    setError(null)
  }

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64 = e.target?.result as string
        setPhotos(prev => [...prev, base64])
      }
      reader.readAsDataURL(file)
    })

    // Clear input for next capture
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!selectedTaskId) {
      setError('请选择任务')
      return
    }

    if (photos.length === 0 && !text.trim()) {
      setError('请添加照片或文字说明')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const selectedTask = selectableTasks.find(t => t.id === selectedTaskId)
      if (!selectedTask) {
        throw new Error('未找到选中的任务')
      }

      // Get display name based on role
      const roleDisplayMap = {
        'manager': '店长',
        'chef': '厨师长',
        'front-employee': '前厅员工',
        'kitchen-employee': '后厨员工'
      }

      await addPost({
        taskId: selectedTaskId,
        taskTitle: selectedTask.title,
        periodId: currentPeriodId,
        department,
        uploadedBy: currentRole,
        uploadedByName: roleDisplayMap[currentRole],
        content: {
          photos: photos.length > 0 ? photos : undefined,
          text: text.trim() || undefined
        }
      })

      // Reset form and close
      setSelectedTaskId('')
      setPhotos([])
      setText('')
      onClose()
    } catch (err) {
      setError('上传失败，请重试')
      console.error('Upload error:', err)
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    if (!uploading) {
      setSelectedTaskId('')
      setPhotos([])
      setText('')
      setError(null)
      onClose()
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">上传任务完成证明</Typography>
          <IconButton onClick={handleClose} size="small" disabled={uploading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Task Selection */}
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>选择任务</InputLabel>
          <Select
            value={selectedTaskId}
            onChange={handleTaskSelect}
            label="选择任务"
            disabled={uploading}
          >
            {selectableTasks.map(task => (
              <MenuItem key={task.id} value={task.id}>
                {task.title}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Photo Upload */}
        <Box mb={3}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="subtitle1">照片</Typography>
            <Button
              variant="outlined"
              startIcon={<PhotoCamera />}
              component="label"
              disabled={uploading}
            >
              拍照
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={handlePhotoCapture}
                multiple
              />
            </Button>
          </Box>

          {photos.length > 0 && (
            <Box display="flex" gap={1} flexWrap="wrap">
              {photos.map((photo, index) => (
                <Box key={index} position="relative">
                  <Box
                    component="img"
                    src={photo}
                    alt={`Photo ${index + 1}`}
                    sx={{
                      width: 100,
                      height: 100,
                      objectFit: 'cover',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  />
                  <IconButton
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      bgcolor: 'background.paper',
                      boxShadow: 1,
                      '&:hover': {
                        bgcolor: 'error.light',
                        color: 'error.contrastText'
                      }
                    }}
                    onClick={() => handleRemovePhoto(index)}
                    disabled={uploading}
                  >
                    <DeleteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Text Input */}
        <TextField
          fullWidth
          multiline
          rows={3}
          label="备注说明"
          placeholder="添加文字说明..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={uploading}
        />
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={uploading}>
          取消
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={uploading || (!selectedTaskId || (photos.length === 0 && !text.trim()))}
          startIcon={uploading ? <CircularProgress size={20} /> : <CloudUpload />}
        >
          {uploading ? '上传中...' : '提交'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}