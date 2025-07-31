// Task Summary component - shows all tasks with completion status
import React, { useMemo, useState } from 'react'
import {
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material'
import {
  CheckCircle,
  RadioButtonUnchecked,
  Warning,
  Assignment,
  History,
  Comment
} from '@mui/icons-material'
import type { TaskTemplate } from '../../utils/workflowParser'
import { loadWorkflowPeriods, getCurrentPeriod } from '../../utils/workflowParser'
import TaskSubmissionDialog from '../TaskSubmissionDialog'
import type { TaskStatusDetail } from '../../services/taskRecordService'

interface TaskStatus {
  taskId: string
  completed: boolean
  completedAt?: Date
  overdue: boolean
}

interface NoticeComment {
  noticeId: string
  comment: string
  timestamp: Date
}

interface TaskSummaryProps {
  tasks: TaskTemplate[]
  taskStatuses: TaskStatus[]
  completedTaskIds: string[]  // Add this for accurate completion tracking
  missingTasks?: { task: TaskTemplate; periodName: string }[]
  noticeComments: NoticeComment[]
  onLateSubmit: (taskId: string, data?: any) => void
  testTime?: Date
  role?: 'manager' | 'chef'
  dbTaskStatuses?: TaskStatusDetail[]  // New prop for database task statuses
}

export const TaskSummary: React.FC<TaskSummaryProps> = ({
  tasks,
  taskStatuses,
  completedTaskIds,
  missingTasks = [],
  noticeComments,
  onLateSubmit,
  testTime,
  role = 'manager',
  dbTaskStatuses = []
}) => {
  const [selectedTask, setSelectedTask] = useState<TaskTemplate | null>(null)
  const [taskSubmissionOpen, setTaskSubmissionOpen] = useState(false)
  const [batchSubmitIndex, setBatchSubmitIndex] = useState<number>(-1)
  const [batchSubmitTasks, setBatchSubmitTasks] = useState<{ task: TaskTemplate; periodName: string }[]>([])
  
  // console.log('TaskSummary received props:', {
  //   tasksCount: tasks.length,
  //   missingTasksCount: missingTasks.length,
  //   missingTasks: missingTasks
  // })
  // Filter out notices and floating tasks (they don't appear in summary)
  const regularTasks = tasks.filter(t => !t.isNotice && !t.isFloating)
  
  // Use database task statuses if available, otherwise fall back to local statuses
  const effectiveTaskStatuses = dbTaskStatuses.length > 0 ? dbTaskStatuses : taskStatuses
  
  // Group tasks by status
  const completedTasks = regularTasks.filter(task => 
    effectiveTaskStatuses.find(s => s.taskId === task.id && s.completed)
  )
  
  const overdueTasks = regularTasks.filter(task => 
    effectiveTaskStatuses.find(s => s.taskId === task.id && s.overdue && !s.completed)
  )
  
  const pendingTasks = regularTasks.filter(task => 
    !effectiveTaskStatuses.find(s => s.taskId === task.id && (s.completed || s.overdue))
  )
  
  // Calculate completion rate for ALL PERIODS up to current
  const completionRate = useMemo(() => {
    const workflowPeriods = loadWorkflowPeriods()
    const currentPeriod = getCurrentPeriod(testTime)
    const now = testTime || new Date()
    
    let totalTasksDue = 0
    let totalTasksCompleted = 0
    
    // Count all tasks from periods that have started (including current)
    workflowPeriods.forEach(period => {
      const [startHour, startMinute] = period.startTime.split(':').map(Number)
      const periodStart = new Date(now)
      periodStart.setHours(startHour, startMinute, 0, 0)
      
      // Include this period if:
      // 1. It has already started (now >= periodStart)
      // 2. OR it's the current period
      // 3. BUT skip closing period for chef
      if ((now >= periodStart || period.id === currentPeriod?.id) && 
          !(role === 'chef' && period.id === 'closing')) {
        
        // 排除floating tasks，因为它们不计入完成率
        const periodTasks = period.tasks[role].filter(t => !t.isNotice && !t.isFloating)
        totalTasksDue += periodTasks.length
        
        // Count how many are completed
        periodTasks.forEach(task => {
          if (completedTaskIds.includes(task.id)) {
            totalTasksCompleted++
          }
        })
      }
    })
    
    // Floating tasks不计入完成率统计，因为它们可以无限提交
    
    // console.log('[Completion Rate]', {
    //   totalTasksDue,
    //   totalTasksCompleted,
    //   completedTaskIds: completedTaskIds.length,
    //   currentPeriod: currentPeriod?.id,
    //   role,
    //   rate: totalTasksDue > 0 ? Math.round((totalTasksCompleted / totalTasksDue) * 100) : 100
    // })
    
    return totalTasksDue > 0 
      ? Math.round((totalTasksCompleted / totalTasksDue) * 100)
      : 100 // If no tasks due, show 100%
  }, [completedTaskIds, testTime, role])
  
  const handleLateSubmitClick = (task: TaskTemplate) => {
    setSelectedTask(task)
    setTaskSubmissionOpen(true)
  }
  
  const handleTaskSubmit = (taskId: string, data: any) => {
    onLateSubmit(taskId, data)
    
    // Check if this is part of batch submission
    if (batchSubmitIndex >= 0 && batchSubmitIndex < batchSubmitTasks.length - 1) {
      // Move to next task in batch
      const nextIndex = batchSubmitIndex + 1
      setBatchSubmitIndex(nextIndex)
      setSelectedTask(batchSubmitTasks[nextIndex].task)
    } else {
      // All tasks completed or single task submission
      setSelectedTask(null)
      setTaskSubmissionOpen(false)
      setBatchSubmitIndex(-1)
      setBatchSubmitTasks([])
    }
  }
  
  const handleDialogClose = () => {
    setSelectedTask(null)
    setTaskSubmissionOpen(false)
    setBatchSubmitIndex(-1)
    setBatchSubmitTasks([])
  }
  
  const handleBatchSubmit = () => {
    // Filter tasks that require submission (not already completed)
    const tasksToSubmit = missingTasks.filter(item => 
      !completedTaskIds.includes(item.task.id)
    )
    
    if (tasksToSubmit.length === 0) return
    
    // Check if any tasks require special submission
    const requiresSpecialSubmission = tasksToSubmit.some(item => 
      item.task.uploadRequirement !== null
    )
    
    if (requiresSpecialSubmission) {
      // Start batch submission process
      setBatchSubmitTasks(tasksToSubmit)
      setBatchSubmitIndex(0)
      setSelectedTask(tasksToSubmit[0].task)
      setTaskSubmissionOpen(true)
    } else {
      // All tasks can be submitted directly
      tasksToSubmit.forEach(item => {
        onLateSubmit(item.task.id)
      })
    }
  }
  
  return (
    <>
    <Paper elevation={1} sx={{ p: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center" gap={1}>
          <Assignment color="primary" />
          <Typography variant="h6">
            任务汇总
          </Typography>
        </Box>
        
        <Chip 
          label={`完成率: ${completionRate}%`}
          color={completionRate === 100 ? 'success' : 'default'}
          variant={completionRate === 100 ? 'filled' : 'outlined'}
          size="medium"
          sx={{ fontWeight: 'medium' }}
        />
      </Box>
      
      <List disablePadding>
        {/* Overdue Tasks */}
        {overdueTasks.length > 0 && (
          <>
            <Typography variant="overline" color="error" sx={{ px: 2 }}>
              已逾期 ({overdueTasks.length})
            </Typography>
            {overdueTasks.map(task => (
              <ListItem 
                key={task.id} 
                divider
                sx={{ 
                  py: 2,
                  display: 'flex',
                  alignItems: 'flex-start'
                }}
              >
                <ListItemIcon sx={{ mt: 0.5 }}>
                  <Warning color="error" />
                </ListItemIcon>
                <ListItemText
                  primary={task.title}
                  secondary={task.description}
                  primaryTypographyProps={{ 
                    color: 'error',
                    fontWeight: 'medium',
                    mb: 0.5
                  }}
                  sx={{ pr: 2 }}
                />
                <Box sx={{ ml: 'auto', flexShrink: 0 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => handleLateSubmitClick(task)}
                    sx={{ 
                      px: 2,
                      py: 1,
                      minWidth: 64
                    }}
                  >
                    补交
                  </Button>
                </Box>
              </ListItem>
            ))}
            <Divider sx={{ my: 2 }} />
          </>
        )}
        
        {/* Pending Tasks */}
        {pendingTasks.length > 0 && (
          <>
            <Typography variant="overline" color="text.secondary" sx={{ px: 2 }}>
              待完成 ({pendingTasks.length})
            </Typography>
            {pendingTasks.map(task => (
              <ListItem key={task.id} divider>
                <ListItemIcon>
                  <RadioButtonUnchecked color="action" />
                </ListItemIcon>
                <ListItemText
                  primary={task.title}
                  secondary={task.description}
                />
              </ListItem>
            ))}
            <Divider sx={{ my: 2 }} />
          </>
        )}
        
        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <>
            <Typography variant="overline" color="success.main" sx={{ px: 2 }}>
              已完成 ({completedTasks.length})
            </Typography>
            {completedTasks.map(task => {
              const status = taskStatuses.find(s => s.taskId === task.id)
              return (
                <ListItem key={task.id} divider>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary={task.title}
                    secondary={
                      status?.completedAt 
                        ? `完成于 ${new Date(status.completedAt).toLocaleTimeString()}`
                        : task.description
                    }
                    secondaryTypographyProps={{ color: 'text.secondary' }}
                  />
                </ListItem>
              )
            })}
          </>
        )}
        
        {/* Notice Comments */}
        {noticeComments.length > 0 && (
          <>
            <Typography variant="overline" color="info.main" sx={{ px: 2, mb: 1 }}>
              运营评论 ({noticeComments.length})
            </Typography>
            {noticeComments.map((comment, index) => (
              <ListItem key={`comment-${index}`} divider sx={{ py: 1.5 }}>
                <ListItemIcon>
                  <Comment color="info" />
                </ListItemIcon>
                <ListItemText
                  primary={tasks.find(t => t.id === comment.noticeId)?.title || '未知通知'}
                  secondary={
                    <Box>
                      <Typography variant="body2" component="span">
                        {comment.comment}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        {comment.timestamp.toLocaleTimeString()}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
            {(missingTasks.length > 0 || regularTasks.length === 0) && <Divider sx={{ my: 2 }} />}
          </>
        )}
        
        {/* Missing Tasks from Previous Periods */}
        {missingTasks.length > 0 && (
          <>
            <Box sx={{ px: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="overline" color="error" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <History fontSize="small" />
                缺失任务 ({missingTasks.length})
              </Typography>
              <Button
                size="small"
                variant="contained"
                color="error"
                onClick={handleBatchSubmit}
                sx={{ 
                  px: 2,
                  py: 0.5,
                  fontSize: '0.75rem'
                }}
              >
                一键补交
              </Button>
            </Box>
            {missingTasks.map((item, index) => (
              <ListItem 
                key={`missing-${index}`} 
                divider
                sx={{ 
                  py: 2,
                  display: 'flex',
                  alignItems: 'flex-start'
                }}
              >
                <ListItemIcon sx={{ mt: 0.5 }}>
                  <Warning color="error" />
                </ListItemIcon>
                <ListItemText
                  primary={item.task.title}
                  secondary={
                    <>
                      <Typography 
                        variant="body2" 
                        component="span"
                        sx={{ 
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '100%'
                        }}
                      >
                        {item.task.description}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        component="span"
                        display="block" 
                        color="error" 
                        sx={{ mt: 0.5 }}
                      >
                        时段：{item.periodName}
                      </Typography>
                    </>
                  }
                  primaryTypographyProps={{ 
                    color: 'error',
                    fontWeight: 'medium',
                    mb: 0.5
                  }}
                  sx={{ pr: 2 }}
                />
                <Box sx={{ ml: 'auto', flexShrink: 0 }}>
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    onClick={() => handleLateSubmitClick(item.task)}
                    sx={{ 
                      px: 2,
                      py: 1,
                      minWidth: 64
                    }}
                  >
                    补交
                  </Button>
                </Box>
              </ListItem>
            ))}
          </>
        )}
        
        {/* Empty State */}
        {regularTasks.length === 0 && noticeComments.length === 0 && missingTasks.length === 0 && (
          <Box textAlign="center" py={4}>
            <Typography color="text.secondary">
              当前时段无任务
            </Typography>
          </Box>
        )}
      </List>
    </Paper>
    
    {/* Task Submission Dialog */}
    <TaskSubmissionDialog
      open={taskSubmissionOpen}
      task={selectedTask}
      isLateSubmission={true}
      onClose={handleDialogClose}
      onSubmit={handleTaskSubmit}
    />
    </>
  )
}