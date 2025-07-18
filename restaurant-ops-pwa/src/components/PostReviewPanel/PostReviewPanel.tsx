// Post Review Panel - Task completion review interface
// Created: Allows managers to review and approve employee posts
import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Divider,
  Chip,
  Avatar,
  IconButton,
  Tabs,
  Tab,
  Alert,
  Fab
} from '@mui/material'
import {
  Close as CloseIcon,
  CheckCircle,
  Cancel,
  Person,
  AccessTime,
  CloudUpload,
  CheckCircleOutline
} from '@mui/icons-material'
import {
  TaskPost,
  getPostsForTask,
  approvePost,
  rejectPost,
  approveMultiplePosts,
  subscribeToTaskPoolUpdates
} from '../../utils/taskPoolManager'

interface PostReviewPanelProps {
  open: boolean
  taskId: string
  taskTitle: string
  currentRole: 'manager' | 'chef' | 'ceo'
  onClose: () => void
  onCompleteTask: () => void
  onAddPost?: () => void
}

export const PostReviewPanel: React.FC<PostReviewPanelProps> = ({
  open,
  taskId,
  taskTitle,
  currentRole,
  onClose,
  onCompleteTask,
  onAddPost
}) => {
  const [posts, setPosts] = useState<TaskPost[]>([])
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([])
  const [tabValue, setTabValue] = useState(0) // 0: pending, 1: approved
  const [showImage, setShowImage] = useState<string | null>(null)

  // Load posts for this task
  useEffect(() => {
    if (!open) return

    const loadPosts = () => {
      const taskPosts = getPostsForTask(taskId, true) // Include rejected
      setPosts(taskPosts)
    }

    // Initial load
    loadPosts()

    // Subscribe to updates
    const unsubscribe = subscribeToTaskPoolUpdates(() => {
      loadPosts()
    })

    return () => unsubscribe()
  }, [taskId, open])

  const pendingPosts = posts.filter(p => p.status === 'pending')
  const approvedPosts = posts.filter(p => p.status === 'approved')
  const rejectedPosts = posts.filter(p => p.status === 'rejected')

  const handleApprove = (postId: string) => {
    approvePost(postId, currentRole)
    setSelectedPostIds(prev => prev.filter(id => id !== postId))
  }

  const handleReject = (postId: string) => {
    rejectPost(postId, currentRole)
    setSelectedPostIds(prev => prev.filter(id => id !== postId))
  }

  const handleApproveSelected = () => {
    approveMultiplePosts(selectedPostIds, currentRole)
    setSelectedPostIds([])
  }

  const handleToggleSelect = (postId: string) => {
    setSelectedPostIds(prev => 
      prev.includes(postId) 
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    )
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
    setSelectedPostIds([])
  }

  const renderPost = (post: TaskPost) => {
    const isSelected = selectedPostIds.includes(post.id)
    const roleDisplayMap = {
      'manager': '店长',
      'chef': '厨师长',
      'front-employee': '前厅员工',
      'kitchen-employee': '后厨员工',
      'ceo': 'CEO'
    }

    return (
      <Card 
        key={post.id} 
        sx={{ 
          mb: 2,
          border: isSelected ? '2px solid' : '1px solid',
          borderColor: isSelected ? 'primary.main' : 'divider',
          cursor: post.status === 'pending' ? 'pointer' : 'default',
          transition: 'all 0.2s'
        }}
        onClick={() => post.status === 'pending' && handleToggleSelect(post.id)}
      >
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Box display="flex" alignItems="center" gap={1}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                <Person sx={{ fontSize: 20 }} />
              </Avatar>
              <Box>
                <Typography variant="subtitle2">
                  {post.uploadedByName || roleDisplayMap[post.uploadedBy]}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  <AccessTime sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
                  {new Date(post.uploadedAt).toLocaleString('zh-CN')}
                </Typography>
              </Box>
            </Box>
            {post.status === 'approved' && (
              <Chip 
                icon={<CheckCircleOutline />}
                label={`${roleDisplayMap[post.reviewedBy || '']}批准`}
                color="success"
                size="small"
              />
            )}
            {post.status === 'rejected' && (
              <Chip 
                icon={<Cancel />}
                label="已拒绝"
                color="error"
                size="small"
              />
            )}
          </Box>

          {post.content.text && (
            <Typography variant="body2" paragraph>
              {post.content.text}
            </Typography>
          )}

          {post.content.photos && post.content.photos.length > 0 && (
            <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
              {post.content.photos.map((photo, idx) => (
                <Box
                  key={idx}
                  component="img"
                  src={photo}
                  alt={`Photo ${idx + 1}`}
                  sx={{
                    width: 100,
                    height: 100,
                    objectFit: 'cover',
                    borderRadius: 1,
                    cursor: 'pointer',
                    '&:hover': {
                      opacity: 0.8
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowImage(photo)
                  }}
                />
              ))}
            </Box>
          )}
        </CardContent>

        {post.status === 'pending' && (
          <CardActions>
            <Button 
              size="small" 
              color="success"
              onClick={(e) => {
                e.stopPropagation()
                handleApprove(post.id)
              }}
            >
              批准
            </Button>
            <Button 
              size="small" 
              color="error"
              onClick={(e) => {
                e.stopPropagation()
                handleReject(post.id)
              }}
            >
              拒绝
            </Button>
          </CardActions>
        )}
      </Card>
    )
  }

  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { height: '80vh' }
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">{taskTitle} - 审核面板</Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
            <Tab 
              label={`待审核 (${pendingPosts.length})`} 
              sx={{ color: pendingPosts.length > 0 ? 'error.main' : 'text.primary' }}
            />
            <Tab label={`已审核 (${approvedPosts.length})`} />
          </Tabs>

          {tabValue === 0 && (
            <>
              {pendingPosts.length === 0 ? (
                <Alert severity="info">暂无待审核内容</Alert>
              ) : (
                <>
                  {selectedPostIds.length > 0 && (
                    <Box mb={2}>
                      <Button 
                        variant="contained" 
                        color="success"
                        onClick={handleApproveSelected}
                        startIcon={<CheckCircle />}
                      >
                        批准选中的 {selectedPostIds.length} 项
                      </Button>
                    </Box>
                  )}
                  {pendingPosts.map(renderPost)}
                </>
              )}
            </>
          )}

          {tabValue === 1 && (
            <>
              {approvedPosts.length === 0 ? (
                <Alert severity="info">暂无已审核内容</Alert>
              ) : (
                approvedPosts.map(renderPost)
              )}
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Box display="flex" gap={1} width="100%">
            {onAddPost && (
              <Button
                variant="outlined"
                startIcon={<CloudUpload />}
                onClick={onAddPost}
              >
                添加我的记录
              </Button>
            )}
            <Box flex={1} />
            <Button onClick={onClose} color="inherit">
              关闭
            </Button>
            <Button 
              variant="contained" 
              color="primary"
              onClick={onCompleteTask}
              disabled={pendingPosts.length > 0}
            >
              {pendingPosts.length > 0 ? '请先处理待审核内容' : '直接完成任务'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog
        open={!!showImage}
        onClose={() => setShowImage(null)}
        maxWidth="lg"
      >
        <DialogContent sx={{ p: 0 }}>
          {showImage && (
            <Box
              component="img"
              src={showImage}
              alt="Preview"
              sx={{ width: '100%', height: 'auto' }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}