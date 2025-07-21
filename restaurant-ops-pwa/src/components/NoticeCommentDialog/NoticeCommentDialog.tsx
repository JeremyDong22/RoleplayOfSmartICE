// Notice comment dialog component for recording comments on notices
// Created for handling comments on in-service operation notices
// Allows users to add multiple comments for each notice

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton
} from '@mui/material'
import {
  Comment,
  Close as CloseIcon,
  AccessTime,
  Add
} from '@mui/icons-material'

interface NoticeCommentDialogProps {
  open: boolean
  noticeTitle: string
  noticeId: string
  existingComments: Array<{ comment: string; timestamp: Date }>
  onClose: () => void
  onSubmit: (comment: string) => void
}

const NoticeCommentDialog: React.FC<NoticeCommentDialogProps> = ({
  open,
  noticeTitle,
  noticeId,
  existingComments,
  onClose,
  onSubmit
}) => {
  const [commentText, setCommentText] = useState('')

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setCommentText('')
    }
  }, [open])

  // Prevent rendering if essential props are missing
  if (!noticeId || !noticeTitle) {
    return null
  }

  const handleSubmit = () => {
    try {
      if (commentText.trim()) {
        onSubmit(commentText.trim())
        setCommentText('') // Clear input after submit for next comment
      }
    } catch (error) {
      console.error('Error submitting comment:', error)
    }
  }

  const handleClose = () => {
    try {
      onClose()
    } catch (error) {
      console.error('Error closing dialog:', error)
    }
  }

  // Format timestamp display
  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit'
    })
  }

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { minHeight: '500px' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <Comment color="primary" />
            <Typography variant="h6">注意事项留言</Typography>
          </Box>
          <IconButton
            onClick={handleClose}
            size="small"
            sx={{ ml: 2 }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {noticeTitle}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Existing Comments */}
          {existingComments.length > 0 && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                历史留言 ({existingComments.length})
              </Typography>
              <List sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 1 }}>
                {existingComments.map((comment, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <Divider />}
                    <ListItem alignItems="flex-start" sx={{ px: 1 }}>
                      <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                        <AccessTime fontSize="small" color="action" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                            {comment.comment}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {formatTime(comment.timestamp)}
                          </Typography>
                        }
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            </Box>
          )}

          {/* New Comment Input */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              添加新留言
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="请输入您的留言..."
              autoFocus
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: '16px'
                }
              }}
            />
          </Box>

          {/* Instructions */}
          <Alert severity="info" variant="outlined">
            您可以对此注意事项添加多条留言，每次输入后点击"添加留言"即可。
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 0, gap: 1 }}>
        <Button
          variant="outlined"
          onClick={handleClose}
          sx={{ flex: 1 }}
        >
          关闭
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={!commentText.trim()}
          startIcon={<Add />}
          sx={{ flex: 1 }}
        >
          添加留言
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default NoticeCommentDialog