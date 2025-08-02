// Component for displaying notice tasks with comment functionality
// Created for lunch-service and dinner-service periods where notices replace regular tasks
import React from 'react'
import {
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  // ListItemText, // Unused import
  Divider,
  Button,
  Chip
} from '@mui/material'
import {
  Announcement,
  Comment,
  CheckCircle
} from '@mui/icons-material'
import type { TaskTemplate } from '../../utils/workflowParser'
import NoticeCommentDialog from '../NoticeCommentDialog'

interface NoticeComment {
  noticeId: string
  comment: string
  timestamp: Date
}

interface NoticeContainerProps {
  notices: TaskTemplate[]
  noticeComments: NoticeComment[]
  onComment: (noticeId: string, comment: string) => void
  isServicePeriod?: boolean // 是否为服务时段（午餐/晚餐）
}

export const NoticeContainer: React.FC<NoticeContainerProps> = ({
  notices,
  noticeComments,
  onComment,
  isServicePeriod = false
}) => {
  const [noticeCommentDialogOpen, setNoticeCommentDialogOpen] = React.useState(false)
  const [activeNotice, setActiveNotice] = React.useState<TaskTemplate | null>(null)

  const handleNoticeComment = (notice: TaskTemplate) => {
    setActiveNotice(notice)
    setNoticeCommentDialogOpen(true)
  }

  const handleCommentSubmit = (comment: string) => {
    if (activeNotice) {
      onComment(activeNotice.id, comment)
    }
    setNoticeCommentDialogOpen(false)
    setActiveNotice(null)
  }

  if (notices.length === 0) {
    return null
  }

  return (
    <>
      <Paper 
        elevation={2} 
        sx={{ 
          p: 3, 
          mt: 2,
          border: theme => isServicePeriod ? `2px solid ${theme.palette.info.main}` : 'none',
          backgroundColor: theme => isServicePeriod ? theme.palette.info.light + '10' : 'inherit'
        }}
      >
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Announcement sx={{ color: 'info.main', fontSize: 28 }} />
          <Typography variant="h5" fontWeight="medium">
            {isServicePeriod ? '服务期间注意事项' : '注意事项'}
          </Typography>
          {isServicePeriod && (
            <Chip 
              label="服务时段" 
              size="small" 
              color="info"
              sx={{ ml: 'auto' }}
            />
          )}
        </Box>
        
        {isServicePeriod && (
          <Typography variant="body2" color="text.secondary" paragraph>
            以下为{notices[0]?.timeSlot?.includes('lunch') ? '午餐' : '晚餐'}服务期间的重要提醒，请在服务过程中关注并记录相关情况。
          </Typography>
        )}
        
        <List disablePadding>
          {notices.map((notice, index) => {
            const noticeCommentList = noticeComments.filter(c => c.noticeId === notice.id)
            const hasCommented = noticeCommentList.length > 0
            
            return (
              <React.Fragment key={notice.id}>
                {index > 0 && <Divider sx={{ my: 2 }} />}
                <ListItem 
                  sx={{ 
                    px: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    backgroundColor: hasCommented ? 'action.hover' : 'transparent',
                    borderRadius: 1,
                    p: 2
                  }}
                >
                  <Box>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Typography 
                        variant="subtitle1" 
                        fontWeight="medium"
                        sx={{ flex: 1 }}
                      >
                        {notice.title}
                      </Typography>
                      {hasCommented && (
                        <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                      )}
                    </Box>
                    
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      paragraph
                      sx={{ mb: 2 }}
                    >
                      {notice.description}
                    </Typography>
                    
                    {/* Comments section */}
                    {noticeCommentList.length > 0 && (
                      <Box sx={{ 
                        mt: 2, 
                        p: 2, 
                        backgroundColor: 'action.selected',
                        borderRadius: 1
                      }}>
                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          fontWeight="medium"
                          gutterBottom
                        >
                          留言记录：
                        </Typography>
                        {noticeCommentList.map((comment, idx) => (
                          <Box key={idx} sx={{ mt: 1 }}>
                            <Typography variant="body2">
                              {comment.comment}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(comment.timestamp).toLocaleTimeString('zh-CN')}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    )}
                    
                    {/* Action button */}
                    <Button
                      variant={hasCommented ? "outlined" : "contained"}
                      size="small"
                      startIcon={<Comment />}
                      onClick={() => handleNoticeComment(notice)}
                      sx={{ 
                        mt: 2,
                        alignSelf: 'flex-start'
                      }}
                    >
                      {hasCommented ? '添加新留言' : '留言'}
                    </Button>
                  </Box>
                </ListItem>
              </React.Fragment>
            )
          })}
        </List>
      </Paper>

      {/* Notice Comment Dialog */}
      <NoticeCommentDialog
        open={noticeCommentDialogOpen}
        notice={activeNotice}
        onClose={() => {
          setNoticeCommentDialogOpen(false)
          setActiveNotice(null)
        }}
        onSubmit={handleCommentSubmit}
      />
    </>
  )
}