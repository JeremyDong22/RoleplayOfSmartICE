// Task Summary component - shows all tasks with completion status
// Fixed: useCallback is imported from React
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react'
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
  TextField,
  CircularProgress,
  Snackbar,
  Alert
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
import TaskSubmissionDialog from '../TaskSubmissionDialog'
import { useTaskData } from '../../contexts/TaskDataContext'
import { type TaskStatusDetail, getRealTimeCompletionRate } from '../../services/taskRecordService'
import { getTaskSummaryStats, type TaskSummaryStats } from '../../services/taskSummaryService'
import { authService } from '../../services/authService'
import { getRestaurantId } from '../../utils/restaurantSetup'
import { supabase } from '../../services/supabase'

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
  onLateSubmit: (taskId: string, data?: any) => Promise<void>
  testTime?: Date
  role?: 'manager' | 'chef' | 'duty_manager'
  dbTaskStatuses?: TaskStatusDetail[]  // New prop for database task statuses
  useDatabase?: boolean  // Flag to enable database mode
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
  dbTaskStatuses = [],
  useDatabase = false
}) => {
  const [selectedTask, setSelectedTask] = useState<TaskTemplate | null>(null)
  const [taskSubmissionOpen, setTaskSubmissionOpen] = useState(false)
  const [batchSubmitIndex, setBatchSubmitIndex] = useState<number>(-1)
  const [batchSubmitTasks, setBatchSubmitTasks] = useState<{ task: TaskTemplate; periodName: string }[]>([])
  const [dbStats, setDbStats] = useState<TaskSummaryStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [dbCompletionRate, setDbCompletionRate] = useState<number | null>(null)
  const [dbMissingTasks, setDbMissingTasks] = useState<Array<{ id: string; title: string; role: string; period: string; periodName?: string; samples?: any[] }>>([])
  const [dbCurrentPendingTasks, setDbCurrentPendingTasks] = useState<Array<{ id: string; title: string; description?: string }>>([])
  const [dbCurrentCompletedTasks, setDbCurrentCompletedTasks] = useState<Array<{ id: string; title: string; completedAt?: string }>>([])
  const [isLoadingCompletionRate, setIsLoadingCompletionRate] = useState(false)
  const [submittingTaskIds, setSubmittingTaskIds] = useState<Set<string>>(new Set())
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [showError, setShowError] = useState(false)
  
  // Get workflow periods from TaskDataContext (includes tasks property)
  const { workflowPeriods: contextWorkflowPeriods } = useTaskData()
  
  // Function to refresh completion rate and missing tasks from database
  const refreshFromDatabase = useCallback(async () => {
    const restaurantId = await getRestaurantId()
    if (!restaurantId) return
    
    setIsLoadingCompletionRate(true)
    try {
      const result = await getRealTimeCompletionRate(restaurantId, role)
      // Refreshed from database successfully
      setDbCompletionRate(result.completionRate)
      setDbMissingTasks(result.missingTasks)
      setDbCurrentPendingTasks(result.currentPeriodTasks.pending)
      setDbCurrentCompletedTasks(result.currentPeriodTasks.completed)
      
      // Also refresh stats if in database mode
      if (useDatabase) {
        const currentUser = authService.getCurrentUser()
        if (currentUser && restaurantId) {
          const stats = await getTaskSummaryStats(currentUser.id, restaurantId, role, testTime)
          setDbStats(stats)
        }
      }
    } catch (error) {
      // Error loading completion rate
    } finally {
      setIsLoadingCompletionRate(false)
    }
  }, [role, testTime, useDatabase])
  
  // Load stats from database if enabled
  useEffect(() => {
    if (!useDatabase) return
    
    const loadStats = async () => {
      const currentUser = authService.getCurrentUser()
      const restaurantId = await getRestaurantId()
      
      if (!currentUser || !restaurantId) return
      
      setIsLoadingStats(true)
      try {
        const stats = await getTaskSummaryStats(currentUser.id, restaurantId, role, testTime)
        setDbStats(stats)
      } catch (error) {
        // Error loading task stats
      } finally {
        setIsLoadingStats(false)
      }
    }
    
    loadStats()
    
    // 移除实时订阅，只在组件加载时获取一次数据
    // 移除 testTime 依赖，避免时间更新导致重复加载
  }, [useDatabase, role]) // 移除 testTime 依赖
  
  // Use a ref to store the latest refreshFromDatabase function
  const refreshFromDatabaseRef = useRef(refreshFromDatabase)
  useEffect(() => {
    refreshFromDatabaseRef.current = refreshFromDatabase
  }, [refreshFromDatabase])
  
  // Load real-time completion rate from database with a stable interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    const loadAndRefresh = async () => {
      const restaurantId = await getRestaurantId()
      if (!restaurantId) return
      
      // Load initially
      refreshFromDatabaseRef.current()
      
      // Refresh every 30 seconds using the ref to get the latest function
      interval = setInterval(() => {
        refreshFromDatabaseRef.current()
      }, 30000)
    }
    
    loadAndRefresh()
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [role, useDatabase]) // Only recreate interval when role or useDatabase changes
  
  // console.log('TaskSummary received props:', {
  //   tasksCount: tasks.length,
  //   missingTasksCount: missingTasks.length,
  //   missingTasks: missingTasks
  // })
  // Filter out notices and floating tasks (they don't appear in summary)
  const regularTasks = tasks.filter(t => !t.isNotice && !t.isFloating)
  
  // Use database task statuses if available, otherwise fall back to local statuses
  const effectiveTaskStatuses = dbTaskStatuses.length > 0 ? dbTaskStatuses : taskStatuses
  
  // Group tasks by status - use database data if available
  const completedTasks = useDatabase && dbCurrentCompletedTasks.length > 0
    ? dbCurrentCompletedTasks.map(dbTask => ({
        id: dbTask.id,
        title: dbTask.title,
        description: '',
        completedAt: dbTask.completedAt
      } as any))
    : regularTasks.filter(task => 
        effectiveTaskStatuses.find(s => s.taskId === task.id && s.completed)
      )
  
  const overdueTasks = regularTasks.filter(task => 
    effectiveTaskStatuses.find(s => s.taskId === task.id && s.overdue && !s.completed)
  )
  
  const pendingTasks = useDatabase && dbCurrentPendingTasks.length >= 0
    ? dbCurrentPendingTasks.map(dbTask => ({
        id: dbTask.id,
        title: dbTask.title,
        description: dbTask.description || ''
      } as any))
    : regularTasks.filter(task => 
        !effectiveTaskStatuses.find(s => s.taskId === task.id && (s.completed || s.overdue))
      )
  
  // Calculate completion rate for ALL PERIODS up to current
  const completionRate = useMemo(() => {
    // Prioritize database completion rate
    if (dbCompletionRate !== null) {
      return dbCompletionRate
    }
    
    // Use database stats if available
    if (useDatabase && dbStats) {
      return dbStats.overallCompletionRate
    }
    
    // Otherwise, use local calculation
    const now = testTime || new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTimeInMinutes = currentHour * 60 + currentMinute
    
    // Find current period from context data (has tasks property)
    const currentPeriod = contextWorkflowPeriods.find(p => {
      const [startHour, startMinute] = p.startTime.split(':').map(Number)
      const [endHour, endMinute] = p.endTime.split(':').map(Number)
      const startInMinutes = startHour * 60 + startMinute
      const endInMinutes = endHour * 60 + endMinute
      
      if (endInMinutes < startInMinutes) {
        if (currentTimeInMinutes >= startInMinutes || currentTimeInMinutes < endInMinutes) {
          return true
        }
      } else {
        if (currentTimeInMinutes >= startInMinutes && currentTimeInMinutes < endInMinutes) {
          return true
        }
      }
      return false
    })
    
    let totalTasksDue = 0
    let totalTasksCompleted = 0
    
    // Count all tasks from periods that have started (including current)
    contextWorkflowPeriods.forEach(period => {
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
        // 处理role名称的映射：'duty_manager' -> 'dutyManager'
        const roleKey = role === 'duty_manager' ? 'dutyManager' : role
        const roleTasks = period.tasks[roleKey as keyof typeof period.tasks]
        if (!roleTasks) return // 跳过没有该角色任务的时段（在forEach中使用return而非continue）
        
        const periodTasks = roleTasks.filter(t => !t.isNotice && !t.isFloating)
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
  }, [completedTaskIds, testTime, role, useDatabase, dbStats, dbCompletionRate, contextWorkflowPeriods])
  
  const handleLateSubmitClick = async (task: TaskTemplate) => {
    // Handle late submission for task
    
    // Always query the database for the task's submission_type
    let taskWithRequirement = task
    
    try {
      const { data: dbTask } = await supabase
        .from('roleplay_tasks')
        .select('submission_type')
        .eq('id', task.id)
        .single()
      
      if (dbTask?.submission_type) {
        // Map submission_type to uploadRequirement
        const typeMap: { [key: string]: string } = {
          'photo': '拍照',
          'audio': '录音',
          'text': '记录',
          'list': '列表',
          'checkbox': '列表'
        }
        taskWithRequirement = {
          ...task,
          uploadRequirement: typeMap[dbTask.submission_type] || null
        }
      }
    } catch (error) {
      // Error fetching task submission_type
    }
    
    // Open TaskSubmissionDialog with isLateSubmission flag
    setSelectedTask(taskWithRequirement)
    setTaskSubmissionOpen(true)
  }
  
  const handleTaskSubmit = async (taskId: string, data: any) => {
    setSubmittingTaskIds(prev => new Set(prev).add(taskId))
    try {
      // TaskSubmissionDialog already includes lateExplanation in the data
      await onLateSubmit(taskId, data)
      
      // Refresh all data from database after successful submission
      await refreshFromDatabase()
      
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
    } catch (error) {
      // Error submitting task
      setErrorMessage('补交失败，请重试！')
      setShowError(true)
      // Don't close dialog on error
    } finally {
      setSubmittingTaskIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(taskId)
        return newSet
      })
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
        
        {isLoadingStats && useDatabase ? (
          <CircularProgress size={24} />
        ) : (
          <Chip 
            label={`完成率: ${completionRate}%`}
            color={completionRate === 100 ? 'success' : 'default'}
            variant={completionRate === 100 ? 'filled' : 'outlined'}
            size="medium"
            sx={{ fontWeight: 'medium' }}
          />
        )}
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
                    disabled={submittingTaskIds.has(task.id)}
                    sx={{ 
                      px: 2,
                      py: 1,
                      minWidth: 80
                    }}
                  >
                    {submittingTaskIds.has(task.id) ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      '补交'
                    )}
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
              // 在数据库模式下，直接使用task.completedAt；否则从status中查找
              const completedAtTime = useDatabase && task.completedAt 
                ? task.completedAt 
                : status?.completedAt
              
              return (
                <ListItem key={task.id} divider>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary={task.title}
                    secondary={
                      completedAtTime 
                        ? `完成于 ${new Date(completedAtTime).toLocaleTimeString()}`
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
        {((useDatabase && (dbMissingTasks.length > 0 || dbStats?.previousPeriodsMissing.length)) || (!useDatabase && missingTasks.length > 0)) && (
          <>
            <Typography variant="overline" color="error" sx={{ px: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <History fontSize="small" />
              缺失任务 ({useDatabase ? (dbMissingTasks.length || dbStats?.previousPeriodsMissing.length || 0) : missingTasks.length})
            </Typography>
            {(useDatabase ? (
              dbMissingTasks.length > 0 ? dbMissingTasks.map((item) => ({
                task: {
                  id: item.id,
                  title: item.title,
                  description: '',
                  uploadRequirement: null,
                  isNotice: false,
                  isFloating: false,
                  samples: item.samples || []
                } as TaskTemplate,
                periodName: item.periodName || item.period
              })) : dbStats?.previousPeriodsMissing.map((item) => ({
                task: {
                  id: item.taskId,
                  title: item.taskTitle,
                  description: item.taskDescription,
                  // 优先使用uploadRequirement，如果没有则根据submissionType转换
                  uploadRequirement: item.uploadRequirement || 
                                  (item.submissionType === 'photo' ? '拍照' : 
                                   item.submissionType === 'audio' ? '录音' :
                                   item.submissionType === 'text' ? '记录' :
                                   item.submissionType === 'list' ? '列表' : 
                                   item.submissionType === 'checkbox' ? '列表' : null),
                  isNotice: false,
                  isFloating: false,
                  samples: item.samples || []
                } as TaskTemplate,
                periodName: item.periodName
              })) || []
            ) : missingTasks).map((item, index) => (
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
                    disabled={submittingTaskIds.has(item.task.id)}
                    sx={{ 
                      px: 2,
                      py: 1,
                      minWidth: 80
                    }}
                  >
                    {submittingTaskIds.has(item.task.id) ? (
                      <CircularProgress size={20} sx={{ color: 'white' }} />
                    ) : (
                      '补交'
                    )}
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
    
    {/* Task Submission Dialog - only render when needed */}
    {taskSubmissionOpen && selectedTask && (
      <TaskSubmissionDialog
        open={taskSubmissionOpen}
        task={selectedTask}
        isLateSubmission={true}
        onClose={handleDialogClose}
        onSubmit={handleTaskSubmit}
      />
    )}
    
    {/* Error Snackbar */}
    <Snackbar
      open={showError}
      autoHideDuration={6000}
      onClose={() => setShowError(false)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert 
        onClose={() => setShowError(false)} 
        severity="error" 
        sx={{ width: '100%' }}
      >
        {errorMessage}
      </Alert>
    </Snackbar>
    </>
  )
}