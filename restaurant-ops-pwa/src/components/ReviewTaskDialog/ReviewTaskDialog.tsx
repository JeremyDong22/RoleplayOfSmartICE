// 值班经理任务审核对话框 - 改进为列表视图，支持图片放大查看
import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  Modal,
  Backdrop,
  IconButton,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CloseIcon from '@mui/icons-material/Close'
import ImageIcon from '@mui/icons-material/Image'
import TextFieldsIcon from '@mui/icons-material/TextFields'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CommentIcon from '@mui/icons-material/Comment'
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import type { TaskTemplate } from '../../utils/workflowParser'
import { useDutyManager } from '../../contexts/DutyManagerContext'

interface DutyManagerSubmission {
  taskId: string
  taskTitle: string
  submittedAt: Date
  content: {
    photos?: string[]
    photoGroups?: Array<{
      id: string
      photos: string[]
      sampleRef?: string
      sampleIndex?: number
      comment?: string
    }>
    text?: string
  }
}

interface ReviewTaskDialogProps {
  open: boolean
  task: TaskTemplate
  onClose: () => void
  onApprove: (taskId: string, data: any) => void
  onReject: (taskId: string, reason: string) => void
}

export const ReviewTaskDialog: React.FC<ReviewTaskDialogProps> = ({
  open,
  task,
  onClose,
  onApprove,
  onReject,
}) => {
  const { submissions: contextSubmissions } = useDutyManager()
  const [submissions, setSubmissions] = useState<DutyManagerSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [allImages, setAllImages] = useState<string[]>([])

  useEffect(() => {
    if (open && task.linkedTasks) {
      // 从Context获取相关任务的提交数据
      const relevantSubmissions = contextSubmissions.filter(sub => 
        task.linkedTasks?.includes(sub.taskId)
      )
      
      if (relevantSubmissions.length > 0) {
        setSubmissions(relevantSubmissions)
        setLoading(false)
        
        // 收集所有图片用于放大查看
        const images: string[] = []
        relevantSubmissions.forEach(sub => {
          if (sub.content.photos) {
            images.push(...sub.content.photos)
          }
        })
        setAllImages(images)
      } else {
        // 如果没有提交数据，显示等待状态
        setLoading(true)
        // 模拟等待一段时间后检查
        const checkInterval = setInterval(() => {
          const newSubmissions = contextSubmissions.filter(sub => 
            task.linkedTasks?.includes(sub.taskId)
          )
          if (newSubmissions.length > 0) {
            setSubmissions(newSubmissions)
            setLoading(false)
            clearInterval(checkInterval)
            
            // 收集所有图片
            const images: string[] = []
            newSubmissions.forEach(sub => {
              if (sub.content.photos) {
                images.push(...sub.content.photos)
              }
            })
            setAllImages(images)
          }
        }, 1000)
        
        return () => clearInterval(checkInterval)
      }
    }
  }, [open, task.linkedTasks, contextSubmissions])

  const handleApprove = () => {
    const reviewData = {
      reviewedAt: new Date(),
      submissions,
      result: 'approved',
    }
    onApprove(task.id, reviewData)
  }

  const handleReject = () => {
    if (!rejectReason.trim()) {
      alert('请填写驳回原因')
      return
    }
    console.log(`ReviewTaskDialog: Rejecting task ${task.id} with reason: ${rejectReason}`)
    onReject(task.id, rejectReason)
  }

  const getTaskTypeLabel = () => {
    if (task.timeSlot === 'lunch-closing') {
      return '午市值班'
    } else if (task.timeSlot === 'closing') {
      return '晚市闭店'
    }
    return '值班任务'
  }

  // 点击图片时设置放大的图片和索引
  const handleImageClick = (image: string) => {
    const index = allImages.findIndex(img => img === image)
    setCurrentImageIndex(index)
    setEnlargedImage(image)
  }

  // 在放大视图中切换图片
  const handlePrevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1)
      setEnlargedImage(allImages[currentImageIndex - 1])
    }
  }

  const handleNextImage = () => {
    if (currentImageIndex < allImages.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1)
      setEnlargedImage(allImages[currentImageIndex + 1])
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{task.title}</Typography>
          <Chip 
            icon={<CheckCircleIcon />} 
            label="已提交" 
            color="success" 
            size="small" 
          />
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            值班经理：张三
          </Typography>
          {submissions.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              提交时间：{new Date(submissions[0].submittedAt).toLocaleString('zh-CN')}
            </Typography>
          )}
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>等待值班经理提交...</Typography>
          </Box>
        ) : submissions.length === 0 ? (
          <Alert severity="info">暂无提交记录</Alert>
        ) : (
          <Box>
            {console.log('[ReviewDialog] All submissions:', submissions)}
            {console.log('[ReviewDialog] First submission content:', submissions[0]?.content)}
            {(() => {
              const validSubmissions = submissions.filter(sub => 
                (sub.content.photoGroups && sub.content.photoGroups.length > 0) ||
                (sub.content.photos && sub.content.photos.length > 0)
              )
              
              if (validSubmissions.length === 0) {
                return (
                  <Alert severity="warning">
                    值班经理已提交任务，但未包含照片记录。请等待值班经理补充照片。
                  </Alert>
                )
              }
              
              return null
            })()}
            {submissions.map((submission, subIndex) => {
              // 检查是否有照片组数据
              let hasPhotoGroups = submission.content.photoGroups && submission.content.photoGroups.length > 0
              let photoGroups = submission.content.photoGroups || []
              
              // 如果没有photoGroups但有photos，创建一个默认组
              if (!hasPhotoGroups && submission.content.photos && submission.content.photos.length > 0) {
                photoGroups = [{
                  id: 'default-group',
                  photos: submission.content.photos,
                  comment: submission.content.text
                }]
                hasPhotoGroups = true
              }
              
              // 如果还是没有照片数据，跳过此submission
              if (!hasPhotoGroups || photoGroups.length === 0) {
                console.log('[ReviewDialog] No photo data for submission:', submission.taskId)
                return null
              }
              
              console.log('[ReviewDialog] Processing submission:', {
                taskId: submission.taskId,
                hasPhotoGroups,
                photoGroupsCount: photoGroups.length,
                photosCount: submission.content.photos?.length || 0,
                photoGroups: photoGroups
              })
              
              return (
                <Box key={subIndex} sx={{ mb: 3 }}>
                  {console.log('[ReviewDialog] Rendering submission:', subIndex, 'hasPhotoGroups:', hasPhotoGroups)}
                  {/* 按照片组显示 */}
                  {hasPhotoGroups ? (
                    <Grid container spacing={2}>
                      {photoGroups.map((group, groupIndex) => (
                        <Grid size={12} key={group.id || groupIndex}>
                          <Paper sx={{ p: 2 }}>
                            {/* 组标题 */}
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="subtitle2" fontWeight="medium">
                                组 {groupIndex + 1}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {group.photos.length} 张照片
                              </Typography>
                            </Box>
                            
                            {/* 照片列表 */}
                            <Box 
                              sx={{ 
                                display: 'flex', 
                                gap: 1, 
                                overflowX: 'auto',
                                py: 1.5,
                                mb: group.comment ? 1 : 0,
                                '&::-webkit-scrollbar': { height: '8px' },
                                '&::-webkit-scrollbar-track': { 
                                  backgroundColor: 'rgba(0,0,0,0.1)',
                                  borderRadius: '4px'
                                },
                                '&::-webkit-scrollbar-thumb': { 
                                  backgroundColor: 'rgba(0,0,0,0.3)',
                                  borderRadius: '4px',
                                  '&:hover': {
                                    backgroundColor: 'rgba(0,0,0,0.5)'
                                  }
                                }
                              }}
                            >
                              {group.photos.map((photo, photoIdx) => {
                                const isValidPhoto = photo && (photo.startsWith('data:') || photo.startsWith('http'))
                                
                                return (
                                  <Box
                                    key={photoIdx}
                                    sx={{
                                      position: 'relative',
                                      minWidth: 100,
                                      height: 100,
                                      borderRadius: 1,
                                      overflow: 'hidden',
                                      cursor: 'pointer',
                                      border: '2px solid transparent',
                                      transition: 'all 0.2s',
                                      '&:hover': {
                                        borderColor: 'primary.main',
                                        transform: 'scale(1.05)'
                                      }
                                    }}
                                    onClick={() => isValidPhoto && handleImageClick(photo)}
                                  >
                                    {isValidPhoto ? (
                                      <Box
                                        component="img"
                                        src={photo}
                                        alt={`组${groupIndex + 1}-照片${photoIdx + 1}`}
                                        sx={{
                                          width: '100%',
                                          height: '100%',
                                          objectFit: 'cover'
                                        }}
                                        onError={(e: any) => {
                                          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2RkZCIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjUwIiB5PSI1MCIgc3R5bGU9ImZpbGw6Izk5OTtmb250LXNpemU6MTJweDtmb250LWZhbWlseTpBcmlhbCxIZWx2ZXRpY2Esc2Fucy1zZXJpZjtkb21pbmFudC1iYXNlbGluZTpjZW50cmFsIj7liqDovb3lpLbotKU8L3RleHQ+PC9zdmc+'
                                        }}
                                      />
                                    ) : (
                                      <Box
                                        sx={{
                                          width: '100%',
                                          height: '100%',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          bgcolor: 'grey.200',
                                          color: 'grey.600',
                                          fontSize: '0.75rem'
                                        }}
                                      >
                                        照片{photoIdx + 1}
                                      </Box>
                                    )}
                                  </Box>
                                )
                              })}
                            </Box>
                            
                            {/* 组备注 */}
                            {group.comment && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <CommentIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">
                                  {group.comment}
                                </Typography>
                              </Box>
                            )}
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  ) : null}
                </Box>
              )
            })}
          </Box>
        )}

        {/* 驳回原因输入框 */}
        {showRejectForm && (
          <Box sx={{ mt: 3 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="驳回原因"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="请说明驳回的具体原因..."
              error={showRejectForm && !rejectReason.trim()}
              helperText={showRejectForm && !rejectReason.trim() ? '请填写驳回原因' : ''}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        {!showRejectForm ? (
          <>
            <Button onClick={() => setShowRejectForm(true)} color="error">
              驳回
            </Button>
            <Button
              onClick={handleApprove}
              variant="contained"
              color="primary"
              disabled={loading || submissions.length === 0}
            >
              通过审核
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => setShowRejectForm(false)}>返回</Button>
            <Button onClick={handleReject} variant="contained" color="error">
              确认驳回
            </Button>
          </>
        )}
      </DialogActions>

      {/* 图片放大查看Modal */}
      <Modal
        open={!!enlargedImage}
        onClose={() => setEnlargedImage(null)}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.9)'
          }
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: '90vw',
            maxHeight: '90vh',
            outline: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          {/* 顶部工具栏 */}
          <Box
            sx={{
              position: 'absolute',
              top: -50,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              px: 2
            }}
          >
            <Typography variant="body1" sx={{ color: 'white' }}>
              {currentImageIndex + 1} / {allImages.length}
            </Typography>
            <IconButton
              sx={{
                color: 'white',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.7)'
                }
              }}
              onClick={() => setEnlargedImage(null)}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {/* 图片容器 */}
          <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            {/* 左箭头 */}
            {currentImageIndex > 0 && (
              <IconButton
                sx={{
                  position: 'absolute',
                  left: -60,
                  color: 'white',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)'
                  }
                }}
                onClick={handlePrevImage}
              >
                <ArrowBackIosIcon />
              </IconButton>
            )}

            {/* 图片 */}
            <Box
              component="img"
              src={enlargedImage || ''}
              alt="放大查看"
              sx={{
                maxWidth: '90vw',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: 1,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
              }}
              onClick={(e) => e.stopPropagation()}
            />

            {/* 右箭头 */}
            {currentImageIndex < allImages.length - 1 && (
              <IconButton
                sx={{
                  position: 'absolute',
                  right: -60,
                  color: 'white',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)'
                  }
                }}
                onClick={handleNextImage}
              >
                <ArrowForwardIosIcon />
              </IconButton>
            )}
          </Box>
        </Box>
      </Modal>
    </Dialog>
  )
}