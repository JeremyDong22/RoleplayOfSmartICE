// Sample Editor Component
// Allows editing of task samples including images, text, and checklists

import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Paper,
  Card,
  CardContent,
  CardMedia,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  CircularProgress,
  Fab,
  Menu,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Chip,
  Stack,
  InputAdornment,
  ListItemIcon,
  Divider
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SaveIcon from '@mui/icons-material/Save'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import ImageIcon from '@mui/icons-material/Image'
import TextFieldsIcon from '@mui/icons-material/TextFields'
import ChecklistIcon from '@mui/icons-material/Checklist'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import EditIcon from '@mui/icons-material/Edit'
import DoneIcon from '@mui/icons-material/Done'
import CloseIcon from '@mui/icons-material/Close'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'
import type { Task, Restaurant, Role } from '../../types/sampleManager.types'
import { SampleManagerService } from '../../services/sampleManagerService'
import { CameraDialog } from './CameraDialog'

interface SampleEditorProps {
  task: Task
  restaurant: Restaurant
  role: Role
  onBack: () => void
  onSave: (task: Task) => void
}

interface SampleSession {
  index: number
  type?: 'images' | 'text' | 'checklist'
  images?: string[]
  text?: string
  checklist?: {
    items: string[]
  }
}

export const SampleEditor: React.FC<SampleEditorProps> = ({ 
  task, 
  restaurant, 
  role,
  onBack,
  onSave
}) => {
  const [taskData, setTaskData] = useState<Task>(task)
  const [samples, setSamples] = useState<SampleSession[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [uploadingImage, setUploadingImage] = useState<number | null>(null)
  const [editingChecklistItem, setEditingChecklistItem] = useState<{sessionIndex: number, itemIndex: number} | null>(null)
  const [editingItemText, setEditingItemText] = useState('')
  const [newChecklistItem, setNewChecklistItem] = useState<{[key: number]: string}>({})
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false)
  const [cameraSessionIndex, setCameraSessionIndex] = useState<number | null>(null)

  useEffect(() => {
    // Load existing samples
    if (task.samples?.samples) {
      setSamples(task.samples.samples.map((s: any, index: number) => ({
        index: index + 1,
        // Check checklist first, then images with length > 0, finally default to text
        type: s.checklist ? 'checklist' : (s.images && s.images.length > 0) ? 'images' : 'text',
        images: s.images || [],
        text: s.text || '',
        checklist: s.checklist
      })))
    }
  }, [task])

  const handleAddSession = (type: 'images' | 'text' | 'checklist') => {
    const newSession: SampleSession = {
      index: samples.length + 1,
      type,
      images: type === 'images' ? [] : undefined,
      text: type === 'text' ? '' : undefined,
      checklist: type === 'checklist' ? { items: [] } : undefined
    }
    setSamples([...samples, newSession])
    setAnchorEl(null)
  }

  const handleDeleteSession = (index: number) => {
    setSamples(samples.filter((_, i) => i !== index))
  }

  const handleImageUpload = async (sessionIndex: number, files: FileList) => {
    if (!files || files.length === 0) return

    setUploadingImage(sessionIndex)
    try {
      const uploadPromises = Array.from(files).map(file => {
        const path = `samples/${restaurant.id}/${role.role_code}/${task.id || 'new'}/session${sessionIndex}`
        return SampleManagerService.uploadImage(file, path)
      })

      const urls = await Promise.all(uploadPromises)
      
      setSamples(samples.map((session, i) => {
        if (i === sessionIndex && session.type === 'images') {
          return {
            ...session,
            images: [...(session.images || []), ...urls]
          }
        }
        return session
      }))
    } catch (error) {
      console.error('Failed to upload images:', error)
      alert('上传图片失败')
    } finally {
      setUploadingImage(null)
    }
  }

  const handleOpenCamera = (sessionIndex: number) => {
    setCameraSessionIndex(sessionIndex)
    setCameraDialogOpen(true)
  }

  const handleCameraCapture = async (imageBlob: Blob) => {
    if (cameraSessionIndex === null) return

    setUploadingImage(cameraSessionIndex)
    try {
      // Convert blob to file
      const file = new File([imageBlob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' })
      
      // Upload the captured photo
      const path = `samples/${restaurant.id}/${role.role_code}/${task.id || 'new'}/session${cameraSessionIndex}`
      const url = await SampleManagerService.uploadImage(file, path)
      
      // Update samples
      setSamples(samples.map((session, i) => {
        if (i === cameraSessionIndex && session.type === 'images') {
          return {
            ...session,
            images: [...(session.images || []), url]
          }
        }
        return session
      }))
    } catch (error) {
      console.error('Failed to upload captured photo:', error)
      alert('上传照片失败')
    } finally {
      setUploadingImage(null)
      setCameraDialogOpen(false)
      setCameraSessionIndex(null)
    }
  }

  const handleDeleteImage = async (sessionIndex: number, imageUrl: string) => {
    try {
      await SampleManagerService.deleteImage(imageUrl)
      setSamples(samples.map((session, i) => {
        if (i === sessionIndex && session.type === 'images') {
          return {
            ...session,
            images: session.images?.filter(url => url !== imageUrl) || []
          }
        }
        return session
      }))
    } catch (error) {
      console.error('Failed to delete image:', error)
    }
  }

  const handleTextChange = (sessionIndex: number, text: string) => {
    setSamples(samples.map((session, i) => {
      if (i === sessionIndex && (session.type === 'text' || session.type === 'images')) {
        return { ...session, text }
      }
      return session
    }))
  }

  const handleChecklistAdd = (sessionIndex: number) => {
    const itemText = newChecklistItem[sessionIndex]?.trim()
    if (!itemText) return

    setSamples(samples.map((session, i) => {
      if (i === sessionIndex && session.type === 'checklist') {
        return {
          ...session,
          checklist: {
            items: [...(session.checklist?.items || []), itemText]
          }
        }
      }
      return session
    }))
    
    // Clear the input
    setNewChecklistItem(prev => ({ ...prev, [sessionIndex]: '' }))
  }

  const handleChecklistRemove = (sessionIndex: number, itemIndex: number) => {
    setSamples(samples.map((session, i) => {
      if (i === sessionIndex && session.type === 'checklist') {
        return {
          ...session,
          checklist: {
            items: session.checklist?.items.filter((_, idx) => idx !== itemIndex) || []
          }
        }
      }
      return session
    }))
  }

  const handleChecklistEdit = (sessionIndex: number, itemIndex: number, newText: string) => {
    setSamples(samples.map((session, i) => {
      if (i === sessionIndex && session.type === 'checklist') {
        const newItems = [...(session.checklist?.items || [])]
        newItems[itemIndex] = newText
        return {
          ...session,
          checklist: {
            items: newItems
          }
        }
      }
      return session
    }))
  }

  const startEditingItem = (sessionIndex: number, itemIndex: number, currentText: string) => {
    setEditingChecklistItem({ sessionIndex, itemIndex })
    setEditingItemText(currentText)
  }

  const saveEditingItem = () => {
    if (editingChecklistItem && editingItemText.trim()) {
      handleChecklistEdit(
        editingChecklistItem.sessionIndex,
        editingChecklistItem.itemIndex,
        editingItemText.trim()
      )
    }
    setEditingChecklistItem(null)
    setEditingItemText('')
  }

  const cancelEditingItem = () => {
    setEditingChecklistItem(null)
    setEditingItemText('')
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Format samples for database
      const formattedSamples = {
        samples: samples.map((session, index) => {
          const base: any = { index: index + 1 }
          
          if (session.type === 'images') {
            base.images = session.images || []
            base.text = session.text || ''
          } else if (session.type === 'text') {
            base.text = session.text || ''
            base.images = [] // Keep empty images array for consistency
          } else if (session.type === 'checklist') {
            base.checklist = session.checklist
            base.text = session.text || '检查清单'
            base.images = [] // Keep empty images array for consistency with database
          }
          
          return base
        })
      }

      if (task.id) {
        // Update existing task
        await SampleManagerService.updateTask(task.id, {
          title: taskData.title,
          description: taskData.description,
          samples: formattedSamples
        })
      } else {
        // Create new task
        const newTask = await SampleManagerService.createTask({
          ...taskData,
          samples: formattedSamples,
          restaurant_id: restaurant.id
        })
        setTaskData(newTask)
      }

      onSave({ ...taskData, samples: formattedSamples })
      alert('保存成功！')
    } catch (error) {
      console.error('Failed to save:', error)
      alert('保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={onBack} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box flex={1}>
          <Typography variant="h4">
            编辑任务样本
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '保存中...' : '保存'}
        </Button>
      </Box>

      {/* Task Details */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          任务信息
        </Typography>
        <TextField
          fullWidth
          label="任务标题"
          value={taskData.title}
          onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
          margin="normal"
        />
        <TextField
          fullWidth
          label="任务描述"
          value={taskData.description || ''}
          onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
          margin="normal"
          multiline
          rows={2}
        />
      </Paper>

      {/* Sample Sessions */}
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            样本内容
          </Typography>
          <Button
            startIcon={<AddIcon />}
            onClick={(e) => setAnchorEl(e.currentTarget)}
            variant="outlined"
          >
            添加样本
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem onClick={() => handleAddSession('images')}>
              <ImageIcon sx={{ mr: 1 }} /> 图片样本
            </MenuItem>
            <MenuItem onClick={() => handleAddSession('text')}>
              <TextFieldsIcon sx={{ mr: 1 }} /> 文字说明
            </MenuItem>
            <MenuItem onClick={() => handleAddSession('checklist')}>
              <ChecklistIcon sx={{ mr: 1 }} /> 检查清单
            </MenuItem>
          </Menu>
        </Box>

        {samples.length === 0 && (
          <Alert severity="info">
            暂无样本，点击上方"添加样本"按钮开始
          </Alert>
        )}

        {samples.map((session, index) => (
          <Card key={index} sx={{ mb: 2 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle1">
                  样本 {index + 1} - {
                    session.type === 'images' ? '图片' :
                    session.type === 'text' ? '文字' : '清单'
                  }
                </Typography>
                <IconButton 
                  size="small" 
                  color="error"
                  onClick={() => handleDeleteSession(index)}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>

              {/* Images Session */}
              {session.type === 'images' && (
                <Box>
                  <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
                    {session.images?.map((url, imgIndex) => (
                      <Box key={imgIndex} position="relative">
                        <img 
                          src={url} 
                          alt={`Sample ${imgIndex + 1}`}
                          style={{ 
                            width: 150, 
                            height: 150, 
                            objectFit: 'cover',
                            borderRadius: 8
                          }}
                        />
                        <IconButton
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            backgroundColor: 'rgba(255,255,255,0.9)'
                          }}
                          onClick={() => handleDeleteImage(index, url)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                  
                  <Box display="flex" gap={1}>
                    <Button
                      component="label"
                      variant="outlined"
                      startIcon={uploadingImage === index ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                      disabled={uploadingImage === index}
                    >
                      上传图片
                      <input
                        type="file"
                        hidden
                        multiple
                        accept="image/*"
                        onChange={(e) => e.target.files && handleImageUpload(index, e.target.files)}
                      />
                    </Button>
                    
                    <Button
                      variant="outlined"
                      startIcon={<CameraAltIcon />}
                      onClick={() => handleOpenCamera(index)}
                      disabled={uploadingImage === index}
                    >
                      拍照
                    </Button>
                  </Box>

                  <TextField
                    fullWidth
                    label="图片说明"
                    value={session.text || ''}
                    onChange={(e) => handleTextChange(index, e.target.value)}
                    margin="normal"
                    multiline
                    rows={2}
                  />
                </Box>
              )}

              {/* Text Session */}
              {session.type === 'text' && (
                <TextField
                  fullWidth
                  label="文字内容"
                  value={session.text || ''}
                  onChange={(e) => handleTextChange(index, e.target.value)}
                  multiline
                  rows={4}
                />
              )}

              {/* Checklist Session - Improved UI */}
              {session.type === 'checklist' && (
                <Box>
                  {/* Checklist Header */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      检查清单项目 ({session.checklist?.items.length || 0} 项)
                    </Typography>
                  </Box>

                  {/* Checklist Items */}
                  <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
                    {session.checklist?.items.map((item, itemIndex) => {
                      const isEditing = editingChecklistItem?.sessionIndex === index && 
                                       editingChecklistItem?.itemIndex === itemIndex
                      
                      return (
                        <React.Fragment key={itemIndex}>
                          {itemIndex > 0 && <Divider />}
                          <ListItem
                            sx={{
                              py: 1.5,
                              '&:hover': {
                                bgcolor: 'action.hover'
                              }
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 40 }}>
                              <CheckBoxOutlineBlankIcon color="action" />
                            </ListItemIcon>
                            
                            {isEditing ? (
                              // Edit mode
                              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TextField
                                  size="small"
                                  fullWidth
                                  value={editingItemText}
                                  onChange={(e) => setEditingItemText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEditingItem()
                                    if (e.key === 'Escape') cancelEditingItem()
                                  }}
                                  autoFocus
                                  variant="outlined"
                                  placeholder="输入检查项内容"
                                />
                                <IconButton 
                                  size="small" 
                                  color="primary"
                                  onClick={saveEditingItem}
                                >
                                  <DoneIcon fontSize="small" />
                                </IconButton>
                                <IconButton 
                                  size="small" 
                                  color="default"
                                  onClick={cancelEditingItem}
                                >
                                  <CloseIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            ) : (
                              // Display mode
                              <>
                                <ListItemText
                                  primary={
                                    <Typography variant="body1">
                                      {itemIndex + 1}. {item}
                                    </Typography>
                                  }
                                />
                                <ListItemSecondaryAction>
                                  <IconButton 
                                    edge="end" 
                                    size="small"
                                    onClick={() => startEditingItem(index, itemIndex, item)}
                                    sx={{ mr: 1 }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton 
                                    edge="end" 
                                    size="small"
                                    color="error"
                                    onClick={() => handleChecklistRemove(index, itemIndex)}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </ListItemSecondaryAction>
                              </>
                            )}
                          </ListItem>
                        </React.Fragment>
                      )
                    })}
                    
                    {/* Empty state */}
                    {(!session.checklist?.items || session.checklist.items.length === 0) && (
                      <ListItem>
                        <ListItemText 
                          primary={
                            <Typography variant="body2" color="text.secondary" align="center">
                              暂无检查项，请添加第一个检查项
                            </Typography>
                          }
                        />
                      </ListItem>
                    )}
                  </List>

                  {/* Add new item input */}
                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="输入新的检查项..."
                      value={newChecklistItem[index] || ''}
                      onChange={(e) => setNewChecklistItem(prev => ({ 
                        ...prev, 
                        [index]: e.target.value 
                      }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleChecklistAdd(index)
                        }
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <AddIcon fontSize="small" color="action" />
                          </InputAdornment>
                        ),
                      }}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleChecklistAdd(index)}
                      disabled={!newChecklistItem[index]?.trim()}
                      sx={{ minWidth: 80 }}
                    >
                      添加
                    </Button>
                  </Box>

                  {/* Tips */}
                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    sx={{ mt: 1, display: 'block' }}
                  >
                    提示：点击编辑图标修改内容，按Enter保存，按Esc取消
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        ))}
      </Paper>

      {/* Camera Dialog */}
      <CameraDialog
        open={cameraDialogOpen}
        onClose={() => {
          setCameraDialogOpen(false)
          setCameraSessionIndex(null)
        }}
        onCapture={handleCameraCapture}
        title="拍摄样本照片"
      />
    </Box>
  )
}