// 浮动任务卡片组件 - 用于展示独立于时间段的特殊任务（如收货验货）
import React, { useState } from 'react'
import {
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  IconButton,
  Collapse,
  Alert
} from '@mui/material'
import {
  LocalShipping,
  CheckCircle,
  ExpandMore,
  ExpandLess,
  PhotoCamera,
  Warning
} from '@mui/icons-material'
import type { TaskTemplate } from '../../utils/workflowParser'
import PhotoSubmissionDialog from '../PhotoSubmissionDialog'
import { specialTaskTheme } from '../../theme/specialTaskTheme'

interface FloatingTaskCardProps {
  tasks: TaskTemplate[]
  completedTaskIds: string[]
  onTaskComplete: (taskId: string, evidence?: any) => void
  showWarning?: boolean
}

export const FloatingTaskCard: React.FC<FloatingTaskCardProps> = ({
  tasks,
  completedTaskIds,
  onTaskComplete,
  showWarning = false
}) => {
  const [expanded, setExpanded] = useState(true)
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string>('')

  const handleTaskClick = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (task?.uploadRequirement === '拍照') {
      setSelectedTaskId(taskId)
      setPhotoDialogOpen(true)
    } else {
      onTaskComplete(taskId)
    }
  }

  const handlePhotoSubmit = (evidence: any[]) => {
    onTaskComplete(selectedTaskId, evidence)
    setPhotoDialogOpen(false)
    setSelectedTaskId('')
  }

  const incompleteTasks = tasks.filter(task => !completedTaskIds.includes(task.id))
  const hasIncompleteTasks = incompleteTasks.length > 0

  return (
    <>
      <Paper 
        elevation={3} 
        sx={{ 
          mb: 2,
          background: hasIncompleteTasks 
            ? 'linear-gradient(135deg, #e3f2fd 0%, #f3f8ff 100%)'
            : specialTaskTheme.completed.background,
          border: hasIncompleteTasks 
            ? `2px solid ${specialTaskTheme.primary}` 
            : `2px solid ${specialTaskTheme.completed.iconColor}`,
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
            <LocalShipping sx={{ fontSize: 28, color: hasIncompleteTasks ? specialTaskTheme.iconColor : specialTaskTheme.completed.iconColor }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                待处理特殊任务
              </Typography>
              <Typography variant="body2" color="text.secondary">
                不受时间段限制，需在进入下一阶段前完成
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip 
              label={hasIncompleteTasks ? `待完成 ${incompleteTasks.length}` : '已完成'}
              size="small"
              icon={hasIncompleteTasks ? <Warning /> : <CheckCircle />}
              sx={{
                backgroundColor: hasIncompleteTasks ? specialTaskTheme.chip.background : specialTaskTheme.completed.iconColor,
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
            {showWarning && hasIncompleteTasks && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                请先完成以下任务才能进入下一阶段
              </Alert>
            )}
            
            {tasks.map(task => {
              const isCompleted = completedTaskIds.includes(task.id)
              return (
                <Box 
                  key={task.id}
                  sx={{ 
                    p: 2,
                    mb: 1,
                    borderRadius: 1,
                    backgroundColor: isCompleted ? specialTaskTheme.completed.background : specialTaskTheme.lightBackground,
                    border: `1px solid ${isCompleted ? specialTaskTheme.completed.borderColor : specialTaskTheme.borderColor}`,
                    transition: 'all 0.3s ease'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography 
                        variant="subtitle1" 
                        sx={{ 
                          fontWeight: 500,
                          color: isCompleted ? 'text.secondary' : 'text.primary',
                          textDecoration: isCompleted ? 'line-through' : 'none'
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
                      {isCompleted ? (
                        <Chip
                          icon={<CheckCircle />}
                          label="已完成"
                          color="success"
                          size="small"
                        />
                      ) : (
                        <Button
                          variant="contained"
                          color="warning"
                          size="small"
                          startIcon={task.uploadRequirement === '拍照' ? <PhotoCamera /> : null}
                          onClick={() => handleTaskClick(task.id)}
                          sx={{ 
                            boxShadow: 2,
                            '&:hover': {
                              boxShadow: 4,
                              transform: 'translateY(-1px)'
                            }
                          }}
                        >
                          立即处理
                        </Button>
                      )}
                    </Box>
                  </Box>
                </Box>
              )
            })}
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
    </>
  )
}

export default FloatingTaskCard