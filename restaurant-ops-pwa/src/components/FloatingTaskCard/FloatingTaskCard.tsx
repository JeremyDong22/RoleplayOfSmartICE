// 浮动任务卡片组件 - 用于展示独立于时间段的特殊任务（如收货验货）
// 更新：移除完成状态追踪，支持无限次提交
import React, { useState } from 'react'
import {
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  IconButton,
  Collapse,
  Alert,
  Snackbar
} from '@mui/material'
import {
  LocalShipping,
  ExpandMore,
  ExpandLess,
  PhotoCamera,
  Loop
} from '@mui/icons-material'
import type { TaskTemplate } from '../../utils/workflowParser'
import PhotoSubmissionDialog from '../PhotoSubmissionDialog'
import { specialTaskTheme } from '../../theme/specialTaskTheme'

interface FloatingTaskCardProps {
  tasks: TaskTemplate[]
  completedTaskIds: string[] // 保留接口兼容性，但不使用
  onTaskComplete: (taskId: string, evidence?: unknown) => void
  showWarning?: boolean
}

export const FloatingTaskCard: React.FC<FloatingTaskCardProps> = ({
  tasks,
  completedTaskIds: _completedTaskIds, // 保留参数但不使用
  onTaskComplete
}) => {
  const [expanded, setExpanded] = useState(true)
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string>('')

  const handleTaskClick = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (task?.uploadRequirement === '拍照') {
      setSelectedTaskId(taskId)
      setPhotoDialogOpen(true)
    } else {
      onTaskComplete(taskId)
      setSuccessMessage(`${task?.title || '任务'}已提交成功`)
    }
  }

  const handlePhotoSubmit = (evidence: unknown[]) => {
    const task = tasks.find(t => t.id === selectedTaskId)
    onTaskComplete(selectedTaskId, evidence)
    setPhotoDialogOpen(false)
    setSelectedTaskId('')
    setSuccessMessage(`${task?.title || '任务'}已提交成功`)
  }

  return (
    <>
      <Paper 
        elevation={3} 
        sx={{ 
          mb: 2,
          background: 'linear-gradient(135deg, #e3f2fd 0%, #f3f8ff 100%)',
          border: `2px solid ${specialTaskTheme.primary}`,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <Box 
          sx={{ 
            p: 2, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            borderBottom: expanded ? '1px solid rgba(0,0,0,0.1)' : 'none'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LocalShipping sx={{ fontSize: 28, color: specialTaskTheme.iconColor }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                特殊任务
              </Typography>
              <Typography variant="body2" color="text.secondary">
                不受时间段限制，可随时提交，可多次提交
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip 
              label={`可提交 ${tasks.length} 项`}
              size="small"
              icon={<Loop />}
              sx={{
                backgroundColor: specialTaskTheme.chip.background,
                color: specialTaskTheme.chip.color,
                fontWeight: 500,
                '& .MuiChip-icon': {
                  color: specialTaskTheme.chip.color
                }
              }}
            />
            <IconButton onClick={() => setExpanded(!expanded)} size="small">
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
        </Box>

        {/* Task List */}
        <Collapse in={expanded}>
          <Box sx={{ p: 2, pt: 0 }}>
            {tasks.map(task => (
              <Box 
                key={task.id}
                sx={{ 
                  p: 2,
                  mb: 1,
                  borderRadius: 1,
                  backgroundColor: specialTaskTheme.lightBackground,
                  border: `1px solid ${specialTaskTheme.borderColor}`,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: 1,
                    borderColor: specialTaskTheme.primary
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography 
                      variant="subtitle1" 
                      sx={{ 
                        fontWeight: 500,
                        color: 'text.primary'
                      }}
                    >
                      {task.title}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      {task.description}
                    </Typography>
                  </Box>
                  <Box sx={{ ml: 2 }}>
                    <Button
                      variant="contained"
                      color="warning"
                      size="small"
                      startIcon={task.uploadRequirement === '拍照' ? <PhotoCamera /> : <Loop />}
                      onClick={() => handleTaskClick(task.id)}
                      sx={{ 
                        boxShadow: 2,
                        '&:hover': {
                          boxShadow: 4,
                          transform: 'translateY(-1px)'
                        }
                      }}
                    >
                      立即提交
                    </Button>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Collapse>
      </Paper>

      {/* Photo Dialog */}
      <PhotoSubmissionDialog
        open={photoDialogOpen}
        onClose={() => setPhotoDialogOpen(false)}
        onSubmit={handlePhotoSubmit}
        taskName={tasks.find(t => t.id === selectedTaskId)?.title || ''}
        taskId={selectedTaskId}
        isFloatingTask={true}
      />

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSuccessMessage('')} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </>
  )
}

export default FloatingTaskCard