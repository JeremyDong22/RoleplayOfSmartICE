// 值班经理任务审核对话框
import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  CircularProgress,
  Alert,
  ImageList,
  ImageListItem,
  TextField,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import type { TaskTemplate } from '../../utils/workflowParser'
import { useDutyManager } from '../../contexts/DutyManagerContext'

interface DutyManagerSubmission {
  taskId: string
  taskTitle: string
  submittedAt: Date
  content: {
    photos?: string[]
    text?: string
    amount?: number
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

  useEffect(() => {
    if (open && task.linkedTasks) {
      // 从Context获取相关任务的提交数据
      const relevantSubmissions = contextSubmissions.filter(sub => 
        task.linkedTasks?.includes(sub.taskId)
      )
      
      if (relevantSubmissions.length > 0) {
        setSubmissions(relevantSubmissions)
        setLoading(false)
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">值班经理任务审核</Typography>
          <Chip label={getTaskTypeLabel()} color="primary" size="small" />
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            值班经理：张三
          </Typography>
          <Typography variant="body2" color="text.secondary">
            提交时间：{new Date().toLocaleString('zh-CN')}
          </Typography>
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
            {submissions.map((submission, index) => (
              <Accordion key={index} defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Typography sx={{ flexGrow: 1 }}>{submission.taskTitle}</Typography>
                    <Chip
                      icon={<CheckCircleIcon />}
                      label="已完成"
                      color="success"
                      size="small"
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {/* 照片展示 */}
                  {submission.content.photos && submission.content.photos.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        上传的照片：
                      </Typography>
                      <ImageList sx={{ height: 200 }} cols={3} rowHeight={164}>
                        {submission.content.photos.map((photo, idx) => (
                          <ImageListItem key={idx}>
                            <img
                              src={photo}
                              alt={`照片${idx + 1}`}
                              loading="lazy"
                              style={{ objectFit: 'cover' }}
                            />
                          </ImageListItem>
                        ))}
                      </ImageList>
                    </Box>
                  )}
                  
                  {/* 文字说明 */}
                  {submission.content.text && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        任务说明：
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          p: 2,
                          bgcolor: 'grey.50',
                          borderRadius: 1,
                          whiteSpace: 'pre-line',
                        }}
                      >
                        {submission.content.text}
                      </Typography>
                    </Box>
                  )}
                  
                  {/* 营业额显示 */}
                  {submission.content.amount !== undefined && (
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: 'primary.50',
                        borderRadius: 1,
                        textAlign: 'center',
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        午市营业额
                      </Typography>
                      <Typography variant="h5" color="primary">
                        ¥{submission.content.amount.toLocaleString()}
                      </Typography>
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
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
    </Dialog>
  )
}