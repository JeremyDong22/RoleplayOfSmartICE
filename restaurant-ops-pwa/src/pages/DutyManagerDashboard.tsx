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
import type { TaskTemplate, WorkflowPeriod } from '../utils/workflowParser'
import { EditableTime } from '../components/TimeControl/EditableTime'
import { TaskSummary } from '../components/TaskSummary'
import { TaskCountdown } from '../components/TaskCountdown/TaskCountdown'
import { useDutyManager } from '../contexts/DutyManagerContext'
import { useTaskData } from '../contexts/TaskDataContext'
import { clearAllAppStorage } from '../utils/clearAllStorage'
import { uploadPhoto } from '../services/storageService'
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
        // 移除 localStorage 操作 - 使用状态管理
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
          // 移除 localStorage 操作 - 完全依赖数据库
          setLastResetTime(resetKey)
        }
      }
      
      // 检查是否需要在早上8:00刷新任务
      if (currentHour === 8 && currentMinute === 0) {
        // 移除 localStorage 操作 - 使用状态管理
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
          // 移除 localStorage 操作 - 完全依赖数据库
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
        // 移除 localStorage 恢复逻辑 - 完全从数据库加载
        
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
        const completedIds = taskStatuses ? Object.keys(taskStatuses).filter(taskId => 
          taskStatuses[taskId].status === 'submitted' && 
          taskStatuses[taskId].review_status !== 'rejected'
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
      // 如果是重新提交，清除之前的驳回状态
      const isResubmit = reviewStatus[taskId]?.status === 'rejected'
      
      // 值班经理任务不应该立即标记为完成，因为需要等待审核
      // 只更新任务状态，不加入completedTaskIds
      setState(prev => ({
        ...prev,
        // 不更新completedTaskIds，保持任务在待审核状态
        taskStatuses: {
          ...prev.taskStatuses,
          [taskId]: { completedAt: new Date(), overdue: false, evidence: data },
        },
      }))
      
      // 立即提交到Context，任务进入待审核状态
      const task = state.activeTasks.find(t => t.id === taskId)
      if (task) {
      
      // 处理照片数据格式
      let photos = []
      let photoGroups = []
      const uploadedPhotoUrls = []
      const uploadedPhotoGroups = []
      
      // 获取用户ID（使用mock ID）
      const userId = 'mock-user-' + Date.now()
      
      // 检查是否有照片组数据（新格式）
      // 注意：PhotoSubmissionDialog 返回的数据可能是嵌套的
      // 数据可能在 data.photoGroups 或 data.evidence.photoGroups 中
      const photoGroupsData = data.photoGroups || (data.evidence && data.evidence.photoGroups) || null
      
      
      if (photoGroupsData && Array.isArray(photoGroupsData)) {
        // 上传每个照片组的照片
        for (const group of photoGroupsData) {
          const uploadedUrls = []
          for (const photo of group.photos || []) {
            if (photo && photo.startsWith('data:')) {
              // 上传照片到Supabase Storage
              const result = await uploadPhoto(photo, userId, taskId)
              if (result) {
                uploadedUrls.push(result.publicUrl)
              } else {
                throw new Error('Photo upload failed')
              }
            } else {
              uploadedUrls.push(photo) // 如果已经是URL，直接使用
            }
          }
          
          uploadedPhotoGroups.push({
            ...group,
            photos: uploadedUrls
          })
          uploadedPhotoUrls.push(...uploadedUrls)
        }
        photoGroups = uploadedPhotoGroups
        photos = uploadedPhotoUrls
      } else if ((data.evidence && Array.isArray(data.evidence)) || 
                 (data.evidence && data.evidence.evidence && Array.isArray(data.evidence.evidence))) {
        // 处理两种情况：直接的 evidence 数组，或嵌套在 data.evidence.evidence 中的数组
        const evidenceArray = Array.isArray(data.evidence) ? data.evidence : data.evidence.evidence
        // 旧格式：evidence 是一个数组，需要转换为照片组
        const groupedByIndex: { [key: number]: any[] } = {}
        
        evidenceArray.forEach((item: any) => {
          const sampleIndex = item.sampleIndex || 0
          if (!groupedByIndex[sampleIndex]) {
            groupedByIndex[sampleIndex] = []
          }
          groupedByIndex[sampleIndex].push(item)
        })
        
        // 将分组后的数据转换为PhotoGroup格式并上传
        for (const [index, items] of Object.entries(groupedByIndex)) {
          const uploadedUrls = []
          for (const item of items) {
            const photoData = typeof item === 'string' ? item : (item.photo || item.photoData || item)
            if (photoData && photoData.startsWith('data:')) {
              const result = await uploadPhoto(photoData, userId, taskId)
              if (result) {
                uploadedUrls.push(result.publicUrl)
              } else {
                throw new Error('Photo upload failed')
              }
            } else {
              uploadedUrls.push(photoData)
            }
          }
          
          uploadedPhotoGroups.push({
            id: `group-${Date.now()}-${index}`,
            photos: uploadedUrls,
            sampleIndex: parseInt(index),
            comment: items[0]?.description || '',
          })
          uploadedPhotoUrls.push(...uploadedUrls)
        }
        
        photoGroups = uploadedPhotoGroups
        photos = uploadedPhotoUrls
      } else if (data.photo) {
        // 处理单个照片的情况
        if (data.photo.startsWith('data:')) {
          const result = await uploadPhoto(data.photo, userId, taskId)
          const photoUrl = result ? result.publicUrl : data.photo
          photos = [photoUrl]
          photoGroups = [{
            id: `group-${Date.now()}`,
            photos: [photoUrl],
            sampleIndex: 0,
            comment: '',
          }]
        } else {
          photos = [data.photo]
          photoGroups = [{
            id: `group-${Date.now()}`,
            photos: [data.photo],
            sampleIndex: 0,
            comment: '',
          }]
        }
      } else if (data.photos) {
        // 处理照片数组的情况
        const uploadedUrls = []
        for (const photo of data.photos) {
          if (photo && photo.startsWith('data:')) {
            const result = await uploadPhoto(photo, userId, taskId)
            if (result) {
              uploadedUrls.push(result.publicUrl)
            } else {
              throw new Error('Photo upload failed')
            }
          } else {
            uploadedUrls.push(photo)
          }
        }
        photos = uploadedUrls
        photoGroups = [{
          id: `group-${Date.now()}`,
          photos: uploadedUrls,
          sampleIndex: 0,
          comment: '',
        }]
      }
      
      const submission = {
        taskId: task.id,
        taskTitle: task.title,
        submittedAt: new Date(),
        content: {
          text: data.textInput || data.transcription || data.text || '',
          photos: photos, // 保留兼容性
          photoGroups: photoGroups, // 新增照片组数据
          amount: data.amount || (task.title.includes('营业款') ? 12580 : undefined),
        },
      }
      
      
      // 移除重复的数据库保存，addSubmission 会处理
      /*
      try {
        const { submitTaskRecord } = await import('../services/taskRecordService')
        const currentDate = new Date().toISOString().split('T')[0]
        
        await submitTaskRecord({
          restaurant_id: 'default-restaurant-id', // TODO: 从context获取
          task_id: task.id,
          date: currentDate,
          period_id: task.timeSlot || 'closing',
          status: 'submitted',
          submission_type: photos.length > 0 ? 'photo' : 'text',
          text_content: submission.content.text,
          photo_urls: photos,
          submission_metadata: {
            photoGroups: photoGroups,
            amount: submission.content.amount
          }
        })
      } catch (dbError) {
        // 继续执行，不影响本地功能
      }
      */
      
      // 只调用 addSubmission，它会在 Context 中保存到数据库
      try {
        await addSubmission(submission)
        
        // Refresh task statuses from database for TaskSummary
        if (currentUserId) {
          const updatedTaskStatuses = await getTodayTaskStatuses(currentUserId)
          setDbTaskStatuses(updatedTaskStatuses)
        }
      } catch (error) {
        throw error
      }
      }
    } catch (error) {
      alert('照片上传失败，请检查网络连接并重试')
      // 回滚状态
      setState(prev => {
        const newTaskStatuses = { ...prev.taskStatuses }
        delete newTaskStatuses[taskId]
        return {
          ...prev,
          completedTaskIds: prev.completedTaskIds.filter(id => id !== taskId),
          taskStatuses: newTaskStatuses
        }
      })
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
          <Toolbar>
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
            <EditableTime onTimeChange={(date) => setTestTime(date || null)} />
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
        <Toolbar>
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
          <EditableTime onTimeChange={(date) => setTestTime(date || null)} />
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
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
                  previousSubmissions={submissions.reduce((acc, sub) => {
                    // 将submissions转换为TaskCountdown期望的格式
                    acc[sub.taskId] = {
                      photoGroups: sub.content.photoGroups || [],
                      photos: sub.content.photos || [],
                      text: sub.content.text,
                      amount: sub.content.amount
                    }
                    return acc
                  }, {} as { [taskId: string]: any })}
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