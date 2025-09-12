// 值班经理工作台页面
// Updated: Fixed scrolling behavior - changed main container from overflow: 'hidden' to overflow: 'auto'
// and removed fixed height constraints to allow proper scrolling
// Updated: Added TaskCountdown component for swipeable task cards like Manager/Chef dashboards
import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  Chip,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useNavigate } from 'react-router-dom'
import type { TaskTemplate, WorkflowPeriod } from '../types/task.types'
import { EditableTime } from '../components/TimeControl/EditableTime'
import { TimeDisplay } from '../components/TimeDisplay'
import { TaskOverviewDropdown } from '../components/TaskOverviewDropdown'
import { TaskSummary } from '../components/TaskSummary'
import { TaskCountdown } from '../components/TaskCountdown/TaskCountdown'
import { useDutyManager } from '../contexts/DutyManagerContext'
import { useTaskData } from '../contexts/TaskDataContext'
import { clearAllAppStorage } from '../utils/clearAllStorage'
import { submitTaskWithMedia } from '../utils/taskSubmissionHelper'
import { getRestaurantId } from '../utils/restaurantSetup'
import { dutyManagerPersistence } from '../services/dutyManagerPersistence'
import { authService } from '../services/authService'
import { restaurantConfigService } from '../services/restaurantConfigService'
import { isClosingPeriod, isLunchClosingPeriod } from '../utils/periodHelpers'
import { getTodayTaskStatuses, type TaskStatusDetail } from '../services/taskRecordService'

interface NoticeComment {
  noticeId: string
  comment: string
  timestamp: Date
}

interface DutyManagerState {
  activeTasks: TaskTemplate[]
  completedTaskIds: string[]
  taskStatuses: { [key: string]: { completedAt: Date; overdue: boolean; evidence?: any } }
  noticeComments: NoticeComment[]
  isWaitingForTrigger: boolean
  currentTrigger?: 'last-customer-left-lunch' | 'last-customer-left-dinner'
  targetPeriod?: WorkflowPeriod  // 保存触发任务所属的时段
  isInClosingPeriod?: boolean // 新增：记录是否处于closing状态
}

const DutyManagerDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { currentTrigger, addSubmission, clearTrigger, reviewStatus, submissions } = useDutyManager()
  const [testTime, setTestTime] = useState<Date | null>(null)
  const [currentPeriod, setCurrentPeriod] = useState<WorkflowPeriod | null>(null)
  
  // 初始化状态 - 不从 localStorage 加载任务状态
  const [state, setState] = useState<DutyManagerState>({
    activeTasks: [],
    completedTaskIds: [],
    taskStatuses: {},
    noticeComments: [],
    isWaitingForTrigger: true,
    currentTrigger: undefined,
  })
  const [isInitialized, setIsInitialized] = useState(false)
  const [lastResetTime, setLastResetTime] = useState<string | null>(null) // 记录最后重置时间
  const [dbTaskStatuses, setDbTaskStatuses] = useState<TaskStatusDetail[]>([]) // Task statuses from database for TaskSummary
  const [currentUserId, setCurrentUserId] = useState<string | null>(null) // Current user ID
  
  // 获取数据库任务数据
  const { workflowPeriods, isLoading, error } = useTaskData()
  
  // 移除 localStorage 保存逻辑 - 所有数据应该从数据库获取
  // 2025-08-02: 根据要求移除本地存储，完全依赖数据库

  // 获取当前时段
  useEffect(() => {
    if (!workflowPeriods.length) return
    
    // 使用数据库中的期间数据查找当前时段
    const currentTime = testTime || new Date()
    const currentHour = currentTime.getHours()
    const currentMinute = currentTime.getMinutes()
    const currentTimeInMinutes = currentHour * 60 + currentMinute
    
    const period = workflowPeriods.find(p => {
      const [startHour, startMinute] = p.startTime.split(':').map(Number)
      const [endHour, endMinute] = p.endTime.split(':').map(Number)
      const startInMinutes = startHour * 60 + startMinute
      const endInMinutes = endHour * 60 + endMinute
      
      // Handle periods that span midnight
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
    
    setCurrentPeriod(period || null)
  }, [testTime, workflowPeriods])
  
  // 基于时间的任务重置逻辑
  useEffect(() => {
    const checkTimeBasedReset = () => {
      const now = testTime || new Date()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      const currentDateStr = now.toISOString().split('T')[0]
      
      // 检查是否需要在晚上10:30（22:30）清空任务
      if (currentHour === 22 && currentMinute === 30) {
        const lastResetStr = lastResetTime
        const resetKey = `${currentDateStr}-22:30`
        
        if (lastResetStr !== resetKey) {
          // 清空所有任务状态
          clearTrigger()
          setState({
            activeTasks: [],
            completedTaskIds: [],
            taskStatuses: {},
            noticeComments: [],
            isWaitingForTrigger: true,
            currentTrigger: undefined,
            isInClosingPeriod: false,
          })
          
          // 清理localStorage中的失败任务（过了营业时间就清理）
          try {
            localStorage.removeItem('duty-manager-failed-tasks')
            // 清理所有任务的照片缓存
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i)
              if (key && key.startsWith('photo-collection-closing-duty-manager-')) {
                localStorage.removeItem(key)
              }
            }
          } catch (e) {
            console.error('Failed to clean localStorage:', e)
          }
          
          setLastResetTime(resetKey)
        }
      }
      
      // 检查是否需要在早上8:00刷新任务
      if (currentHour === 8 && currentMinute === 0) {
        const lastResetStr = lastResetTime
        const resetKey = `${currentDateStr}-8:00`
        
        if (lastResetStr !== resetKey) {
          // 清空所有任务状态，准备新的一天
          clearTrigger()
          setState({
            activeTasks: [],
            completedTaskIds: [],
            taskStatuses: {},
            noticeComments: [],
            isWaitingForTrigger: true,
            currentTrigger: undefined,
            isInClosingPeriod: false,
          })
          
          // 清理localStorage中的失败任务（新的一天清理旧数据）
          try {
            localStorage.removeItem('duty-manager-failed-tasks')
            // 清理所有任务的照片缓存
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i)
              if (key && key.startsWith('photo-collection-')) {
                localStorage.removeItem(key)
              }
            }
          } catch (e) {
            console.error('Failed to clean localStorage:', e)
          }
          
          setLastResetTime(resetKey)
        }
      }
    }
    
    // 立即检查一次
    checkTimeBasedReset()
    
    // 每分钟检查一次
    const interval = setInterval(checkTimeBasedReset, 60000)
    
    return () => clearInterval(interval)
  }, [testTime])
  
  // 从数据库加载任务状态 - 只在组件初始化时执行一次
  useEffect(() => {
    const loadTaskStatusesFromDB = async () => {
      try {
        // 恢复失败的任务数据
        try {
          const failedTasksStr = localStorage.getItem('duty-manager-failed-tasks')
          if (failedTasksStr) {
            const failedTasks = JSON.parse(failedTasksStr)
            // Restored failed tasks from localStorage
            
            // 检查任务是否是今天的（避免恢复昨天的失败任务）
            const today = new Date().toISOString().split('T')[0]
            const todayTasks: any = {}
            
            Object.entries(failedTasks).forEach(([taskId, task]: [string, any]) => {
              const taskDate = new Date(task.timestamp).toISOString().split('T')[0]
              if (taskDate === today) {
                todayTasks[taskId] = task
              }
            })
            
            if (Object.keys(todayTasks).length > 0) {
              // 恢复任务状态，这样用户可以看到之前的提交
              const restoredStatuses: any = {}
              Object.entries(todayTasks).forEach(([taskId, task]: [string, any]) => {
                restoredStatuses[taskId] = {
                  completedAt: new Date(task.timestamp),
                  overdue: false,
                  evidence: task.evidence,
                  status: 'pending',  // 标记为待上传状态
                  review_status: 'pending'  // 审核状态也是pending
                }
              })
              
              setState(prev => ({
                ...prev,
                taskStatuses: { ...prev.taskStatuses, ...restoredStatuses }
              }))
              
              // 提示用户有未上传的任务
              setTimeout(() => {
                alert('检测到有未成功上传的任务，您的照片已自动恢复。\n请在任务列表中重新提交。')
              }, 1500)
            } else if (Object.keys(failedTasks).length > 0) {
              // 清理过期的失败任务
              localStorage.removeItem('duty-manager-failed-tasks')
            }
          }
        } catch (e) {
          console.error('Failed to restore failed tasks:', e)
        }
        
        const currentUser = authService.getCurrentUser()
        if (!currentUser) {
          setIsInitialized(true)
          return
        }
        
        setCurrentUserId(currentUser.id)

        const restaurantId = currentUser.restaurantId || await restaurantConfigService.getRestaurantId() || ''
        const { taskStatuses } = await dutyManagerPersistence.getDutyManagerTaskStatuses(
          currentUser.id,
          restaurantId
        )
        
        // Load today's task statuses for TaskSummary
        const dbStatuses = await getTodayTaskStatuses(currentUser.id)
        setDbTaskStatuses(dbStatuses)

        // 更新已完成的任务ID列表
        // 注意：pending状态的任务不算完成，需要等待审核
        const completedIds = taskStatuses ? Object.keys(taskStatuses).filter(taskId => 
          taskStatuses[taskId].status === 'submitted' && 
          taskStatuses[taskId].review_status === 'approved'  // 只有approved才算完成
        ) : []

        // 直接使用数据库的状态
        setState(prev => ({
            ...prev,
            completedTaskIds: completedIds,
            taskStatuses: taskStatuses ? Object.fromEntries(
              Object.entries(taskStatuses).map(([taskId, status]) => [
                taskId,
                {
                  completedAt: status.submittedAt,
                  overdue: false,
                  evidence: {}
                }
              ])
            ) : {}
          }))

        setIsInitialized(true)
      } catch (error) {
        setIsInitialized(true)
      }
    }

    loadTaskStatusesFromDB()
  }, []) // 只在组件挂载时执行一次
  
  // 移除 localStorage 保存逻辑 - 所有状态都从数据库获取

  // Note: CLEAR_ALL_STORAGE functionality has been removed as we're focusing on 
  // cross-device communication via Supabase Realtime

  // 移除频繁的日志输出

  // 检查当前时段并自动加载任务
  useEffect(() => {
    // 只在初始化完成后执行
    if (!isInitialized) return
    
    // 如果是闭店时段或午市收市时段，加载值班经理任务
    if (isClosingPeriod(currentPeriod) || isLunchClosingPeriod(currentPeriod)) {
      
      // 获取当前时段的值班经理任务
      const dutyTasks = (currentPeriod.tasks as any).dutyManager || []
      
      
      // 获取所有值班经理任务（不再需要prerequisiteTrigger）
      const periodTasks = dutyTasks.filter((task: any) => {
        return task.role === 'DutyManager' && task.uploadRequirement !== '审核'
      })
      
      
      if (periodTasks.length > 0) {
        setState(prev => ({
          ...prev,
          activeTasks: periodTasks,
          isWaitingForTrigger: false,
          currentTrigger: isLunchClosingPeriod(currentPeriod) ? 'last-customer-left-lunch' : 'last-customer-left-dinner',
          targetPeriod: currentPeriod,
          isInClosingPeriod: isClosingPeriod(currentPeriod),
        }))
      } else if (dutyTasks.length > 0) {
        // 如果有任务但都被过滤掉了，也要设置状态以显示界面
        setState(prev => ({
          ...prev,
          activeTasks: dutyTasks,
          isWaitingForTrigger: false,
          currentTrigger: isLunchClosingPeriod(currentPeriod) ? 'last-customer-left-lunch' : 'last-customer-left-dinner',
          targetPeriod: currentPeriod,
          isInClosingPeriod: isClosingPeriod(currentPeriod),
        }))
      }
    }
  }, [currentPeriod, testTime, isInitialized])  // 简化依赖，避免循环

  // 任务完成处理
  const handleTaskComplete = async (taskId: string, data: any) => {
    try {
      const now = testTime || new Date()
      
      // 获取真实用户ID
      const currentUser = authService.getCurrentUser()
      if (!currentUser) {
        console.error('[DutyManagerDashboard] No authenticated user found')
        alert('请先登录')
        throw new Error('未找到登录用户')
      }
      const userId = currentUser.id
      
      // 获取餐厅ID
      const restaurantId = await getRestaurantId()
      if (!restaurantId) {
        console.error('[DutyManagerDashboard] No restaurant ID found')
        throw new Error('未找到餐厅ID')
      }
      
      // 立即提交到Context，任务进入待审核状态
      const task = state.activeTasks.find(t => t.id === taskId)
      if (task) {
        console.log('[DutyManagerDashboard] Using submitTaskWithMedia for unified upload')
        
        // 使用统一的submitTaskWithMedia函数，与店长和厨师保持一致
        const result = await submitTaskWithMedia({
          taskId,
          userId,
          restaurantId,
          date: now.toISOString().split('T')[0],
          periodId: state.targetPeriod?.id || '',
          uploadRequirement: task.uploadRequirement,
          data,
          onProgress: (progress, message) => {
            console.log(`[DutyManagerDashboard] Upload progress: ${progress}% - ${message}`)
          }
        })
        
        console.log('[DutyManagerDashboard] Task successfully submitted:', result.id)
        
        // 值班经理任务不应该立即标记为完成，因为需要等待审核
        // 只更新任务状态，不加入completedTaskIds
        setState(prev => ({
          ...prev,
          // 不更新completedTaskIds，保持任务在待审核状态
          taskStatuses: {
            ...prev.taskStatuses,
            [taskId]: { completedAt: now, overdue: false, evidence: data },
          },
        }))
        
        // 提交到Context用于店长审核
        const submission = {
          taskId: task.id,
          taskTitle: task.title,
          submittedAt: now,
          content: {
            text: data.textInput || data.transcription || data.text || '',
            photos: result.photo_urls || [],
            photoGroups: data.photoGroups || [],
            amount: data.amount || (task.title.includes('营业款') ? 12580 : undefined),
          },
        }
        
        // 提交到Context，等待店长审核
        await addSubmission(submission)
        
        console.log('[DutyManagerDashboard] Task submission successful')
        
        // Refresh task statuses from database for TaskSummary
        if (currentUserId) {
          const updatedTaskStatuses = await getTodayTaskStatuses(currentUserId)
          setDbTaskStatuses(updatedTaskStatuses)
        }
        
        // 清理成功上传的localStorage
        try {
          const photoStorageKey = `photo-collection-${taskId}`
          localStorage.removeItem(photoStorageKey)
          
          const failedTasksStr = localStorage.getItem('duty-manager-failed-tasks')
          if (failedTasksStr) {
            const failedTasks = JSON.parse(failedTasksStr)
            delete failedTasks[taskId]
            if (Object.keys(failedTasks).length > 0) {
              localStorage.setItem('duty-manager-failed-tasks', JSON.stringify(failedTasks))
            } else {
              localStorage.removeItem('duty-manager-failed-tasks')
            }
          }
        } catch (e) {
          console.error('Failed to clean up localStorage:', e)
        }
      } else {
        console.error('[DutyManagerDashboard] Task not found:', taskId)
        throw new Error('任务未找到')
      }
    } catch (error) {
      console.error('[DutyManagerDashboard] Task submission failed:', error)
      
      // 保存失败的任务到localStorage，以便页面刷新后恢复
      const failedTask = {
        taskId,
        evidence: data,
        timestamp: Date.now()
      }
      
      try {
        const existingFailed = localStorage.getItem('duty-manager-failed-tasks')
        const failedTasks = existingFailed ? JSON.parse(existingFailed) : {}
        failedTasks[taskId] = failedTask
        localStorage.setItem('duty-manager-failed-tasks', JSON.stringify(failedTasks))
      } catch (e) {
        console.error('Failed to save task to localStorage:', e)
      }
      
      // 重要：必须重新抛出错误，让PhotoSubmissionDialog知道提交失败
      throw error
    }
  }

  // 处理通知评论
  const handleNoticeComment = (noticeId: string, comment: string) => {
    setState(prev => ({
      ...prev,
      noticeComments: [
        ...prev.noticeComments,
        {
          noticeId,
          comment,
          timestamp: new Date()
        }
      ]
    }))
  }

  // 监听审核状态变化，更新completedTaskIds
  useEffect(() => {
    // 获取所有已审核通过的任务ID
    const approvedTaskIds = Object.entries(reviewStatus)
      .filter(([_, status]) => status.status === 'approved')
      .map(([taskId, _]) => taskId)
    
    // 更新completedTaskIds，添加已审核通过的任务
    setState(prev => {
      const newCompletedIds = [...new Set([...prev.completedTaskIds, ...approvedTaskIds])]
      if (newCompletedIds.length !== prev.completedTaskIds.length) {
        return {
          ...prev,
          completedTaskIds: newCompletedIds
        }
      }
      return prev
    })
    
    // 检查所有任务是否都已审核通过
    if (state.activeTasks.length > 0) {
      const allApproved = state.activeTasks.every(task => 
        reviewStatus[task.id]?.status === 'approved'
      )
      
      if (allApproved) {
        // 不再自动清除任务，让界面继续显示完成状态
        // 任务将在晚上10:30（闭店时间）或早上8:00（新一天开始）时清除
      }
    }
  }, [reviewStatus, state.activeTasks])

  // 移除频繁刷新逻辑 - 只依赖 Realtime 更新

  // 返回到角色选择页面
  const handleBack = () => {
    // 清除Context中的数据
    clearTrigger()
    
    navigate('/role-selection')
  }

  // 等待界面
  if (state.isWaitingForTrigger) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AppBar position="static">
          <Toolbar sx={{ py: 1 }}>
            <IconButton
              edge="start"
              color="inherit"
              onClick={handleBack}
              sx={{ mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              值班经理工作台
            </Typography>
            <TimeDisplay testTime={testTime || undefined} />
            <TaskOverviewDropdown testTime={testTime || undefined} />
            {(import.meta.env.VITE_SHOW_DEV_TOOLS === 'true' || window.location.hostname === 'localhost') && (
              <EditableTime onTimeChange={(date) => setTestTime(date || null)} />
            )}
          </Toolbar>
        </AppBar>
        
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: 'grey.50' 
        }}>
          <Paper sx={{ p: 6, textAlign: 'center', maxWidth: 500 }}>
            <Typography variant="h4" gutterBottom>
              值班经理工作台
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
              等待值班时段开始
            </Typography>
            <Box sx={{ 
              p: 3, 
              bgcolor: 'grey.100', 
              borderRadius: 2,
              border: '2px dashed',
              borderColor: 'grey.300'
            }}>
              <Typography variant="body1" color="text.secondary">
                当前状态：待命中
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                闭店时段（21:30）将自动开始值班任务
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Box>
    )
  }

  // 有任务时的界面
  const activeTasks = state.activeTasks.filter(task => !task.isNotice)
  const allTasksCompleted = activeTasks.every(task => 
    state.completedTaskIds.includes(task.id)
  )

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static">
        <Toolbar sx={{ py: 1 }}>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleBack}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            值班经理
          </Typography>
          <TimeDisplay testTime={testTime || undefined} />
          <TaskOverviewDropdown testTime={testTime || undefined} />
          {(import.meta.env.VITE_SHOW_DEV_TOOLS === 'true' || window.location.hostname === 'localhost') && (
            <EditableTime onTimeChange={(date) => setTestTime(date || null)} />
          )}
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflow: 'auto', pb: 10 }}>
        <Grid container>
          <Grid size={{ xs: 12, md: 8 }}>
            <Box sx={{ p: 2 }}>
              {/* Current Task Container with swipeable cards */}
              {state.activeTasks.length > 0 && state.targetPeriod ? (
                <TaskCountdown
                  period={state.targetPeriod}  // 使用目标时段而不是当前时段
                  tasks={state.activeTasks}
                  completedTaskIds={state.completedTaskIds}
                  noticeComments={state.noticeComments}
                  testTime={testTime || undefined}
                  onComplete={handleTaskComplete}
                  onComment={handleNoticeComment}
                  hideTimer={true}  // 值班经理不显示倒计时
                  reviewStatus={reviewStatus}  // 传递审核状态
                  previousSubmissions={(() => {
                    // 将submissions和失败的任务都传递给TaskCountdown
                    const allSubmissions: { [taskId: string]: any } = {}
                    
                    // 添加来自Context的submissions（已提交的任务）
                    submissions.forEach(sub => {
                      // 检查是否是被驳回的任务
                      const isRejected = reviewStatus[sub.taskId]?.status === 'rejected'
                      
                      if (isRejected) {
                        // 对于被驳回的任务，转换photo_urls为photoGroups格式
                        const photoGroups = []
                        
                        // 如果有photoGroups，使用它
                        if (sub.content.photoGroups && sub.content.photoGroups.length > 0) {
                          photoGroups.push(...sub.content.photoGroups)
                        } 
                        // 否则，如果有photos数组（photo_urls），转换为photoGroups格式
                        else if (sub.content.photos && sub.content.photos.length > 0) {
                          // 将photo_urls转换为photoGroups格式
                          photoGroups.push({
                            id: `group-${Date.now()}`,
                            photos: sub.content.photos,
                            comment: sub.content.text || '',
                            createdAt: Date.now()
                          })
                        }
                        
                        allSubmissions[sub.taskId] = {
                          photoGroups: photoGroups,
                          photos: sub.content.photos || [],
                          text: sub.content.text,
                          amount: sub.content.amount
                        }
                      } else {
                        // 正常任务保持原样
                        allSubmissions[sub.taskId] = {
                          photoGroups: sub.content.photoGroups || [],
                          photos: sub.content.photos || [],
                          text: sub.content.text,
                          amount: sub.content.amount
                        }
                      }
                    })
                    
                    // 添加来自taskStatuses的evidence（失败的任务）
                    Object.entries(state.taskStatuses).forEach(([taskId, status]) => {
                      if (status.evidence && !allSubmissions[taskId]) {
                        // 如果有evidence但还没有submission，说明是失败的任务
                        allSubmissions[taskId] = status.evidence
                      }
                    })
                    
                    return allSubmissions
                  })()}
                />
              ) : (
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
                    当前任务 Current Task
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    暂无任务
                  </Typography>
                </Paper>
              )}

              {/* 显示审核状态总览 */}
              {state.activeTasks.length > 0 && allTasksCompleted && (
                <Box sx={{ mt: 3, p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    任务提交状态
                  </Typography>
                  {state.activeTasks.map(task => {
                    const status = reviewStatus[task.id]
                    const isSubmitted = state.completedTaskIds.includes(task.id)
                    
                    return (
                      <Box key={task.id} sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" component="span">
                            {task.title}:
                          </Typography>
                          {!isSubmitted && <Chip label="未提交" size="small" />}
                          {isSubmitted && !status && <Chip label="待审核" color="warning" size="small" />}
                          {status?.status === 'approved' && <Chip label="已通过" color="success" size="small" />}
                          {status?.status === 'rejected' && <Chip label="待修改" color="error" size="small" />}
                        </Box>
                        {status?.status === 'rejected' && status.reason && (
                          <Typography variant="caption" color="error" sx={{ ml: 2, display: 'block' }}>
                            驳回原因: {status.reason}
                          </Typography>
                        )}
                      </Box>
                    )
                  })}
                </Box>
              )}
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TaskSummary
              tasks={state.activeTasks}
              taskStatuses={Object.entries(state.taskStatuses).map(([taskId, status]) => ({
                taskId,
                completed: state.completedTaskIds.includes(taskId),
                completedAt: status?.completedAt,
                overdue: status?.overdue || false
              }))}
              completedTaskIds={state.completedTaskIds}
              missingTasks={[]}
              noticeComments={[]}
              onLateSubmit={() => {}}
              testTime={testTime || undefined}
              role="duty_manager"
              dbTaskStatuses={dbTaskStatuses}
              useDatabase={true}
            />
          </Grid>
        </Grid>
      </Box>
    </Box>
  )
}

export default DutyManagerDashboard