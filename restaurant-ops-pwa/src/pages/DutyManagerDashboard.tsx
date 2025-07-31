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
import { getCurrentPeriod, workflowPeriods } from '../utils/workflowParser'
import { EditableTime } from '../components/TimeControl/EditableTime'
import { TaskSummary } from '../components/TaskSummary'
import { TaskCountdown } from '../components/TaskCountdown/TaskCountdown'
import { useDutyManager } from '../contexts/DutyManagerContext'
import { clearAllAppStorage } from '../utils/clearAllStorage'
import { uploadPhoto } from '../services/storageService'
import { dutyManagerPersistence } from '../services/dutyManagerPersistence'
import { authService } from '../services/authService'

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
  
  // 从localStorage恢复状态（只恢复基本状态，不恢复任务完成状态）
  const loadSavedState = (): DutyManagerState => {
    try {
      const savedState = localStorage.getItem('dutyManagerDashboardState')
      if (savedState) {
        const parsed = JSON.parse(savedState)
        console.log('[DutyManagerDashboard] Loading saved state:', parsed)
        
        // 恢复日期对象
        if (parsed.noticeComments) {
          parsed.noticeComments.forEach((comment: any) => {
            comment.timestamp = new Date(comment.timestamp)
          })
        }
        
        // 如果有保存的目标时段和任务，恢复完整的任务数据
        if (parsed.targetPeriod && parsed.activeTasks && parsed.activeTasks.length > 0) {
          const targetPeriod = workflowPeriods.find(p => p.id === parsed.targetPeriod.id)
          if (targetPeriod) {
            const dutyTasks = (targetPeriod.tasks as any).dutyManager || []
            const fullTasks = parsed.activeTasks.map((savedTask: any) => {
              return dutyTasks.find((task: any) => task.id === savedTask.id) || savedTask
            }).filter(Boolean)
            
            const restoredState = {
              ...parsed,
              activeTasks: fullTasks,
              targetPeriod: targetPeriod,
              isWaitingForTrigger: false, // 确保设置为false，因为有激活的任务
              // 重要：不从localStorage恢复任务完成状态，这些将从数据库加载
              completedTaskIds: [],
              taskStatuses: {},
            }
            console.log('[DutyManagerDashboard] Restored state with full tasks:', restoredState)
            return restoredState
          }
        }
        
        // 确保恢复的状态有正确的isWaitingForTrigger值
        if (parsed.activeTasks && parsed.activeTasks.length > 0) {
          parsed.isWaitingForTrigger = false
        }
        
        // 重要：清除可能存在的任务完成状态，这些应该从数据库加载
        console.log('[DutyManagerDashboard] Final restored state (without completion status):', {
          ...parsed,
          completedTaskIds: [],
          taskStatuses: {},
        })
        return {
          ...parsed,
          completedTaskIds: [],
          taskStatuses: {},
        }
      }
    } catch (e) {
      console.error('[DutyManagerDashboard] Failed to load saved state:', e)
    }
    
    return {
      activeTasks: [],
      completedTaskIds: [],
      taskStatuses: {},
      noticeComments: [],
      isWaitingForTrigger: true,
      currentTrigger: undefined,
    }
  }
  
  const [state, setState] = useState<DutyManagerState>(loadSavedState)
  const [isInitialized, setIsInitialized] = useState(false)

  // 获取当前时段
  useEffect(() => {
    const period = getCurrentPeriod(testTime || undefined)
    setCurrentPeriod(period)
  }, [testTime])
  
  // 从数据库加载任务状态
  useEffect(() => {
    const loadTaskStatusesFromDB = async () => {
      try {
        const currentUser = authService.getCurrentUser()
        if (!currentUser) {
          console.log('[DutyManagerDashboard] No authenticated user, skip loading from DB')
          setIsInitialized(true)
          return
        }

        const restaurantId = currentUser.restaurantId || localStorage.getItem('selectedRestaurantId') || 'default-restaurant'
        const { taskStatuses, submissions: dbSubmissions } = await dutyManagerPersistence.getDutyManagerTaskStatuses(
          currentUser.id,
          restaurantId
        )

        console.log('[DutyManagerDashboard] Loaded from database:', { taskStatuses, dbSubmissions })

        // 更新已完成的任务ID列表
        const completedIds = Object.keys(taskStatuses).filter(taskId => 
          taskStatuses[taskId].status === 'submitted' && 
          taskStatuses[taskId].review_status !== 'rejected'
        )

        // 构建审核状态映射
        const reviewStatuses: any = {}
        Object.entries(taskStatuses).forEach(([taskId, status]) => {
          if (status.status === 'submitted') {
            reviewStatuses[taskId] = {
              status: status.review_status || 'pending',
              reviewedAt: status.reviewedAt || status.submittedAt,
              reason: status.reject_reason
            }
          }
        })

        // 更新状态
        setState(prev => ({
          ...prev,
          completedTaskIds: [...new Set([...prev.completedTaskIds, ...completedIds])],
          taskStatuses: {
            ...prev.taskStatuses,
            ...Object.fromEntries(
              Object.entries(taskStatuses).map(([taskId, status]) => [
                taskId,
                {
                  completedAt: status.submittedAt,
                  overdue: false,
                  evidence: {} // 可以从数据库中恢复更多信息
                }
              ])
            )
          }
        }))

        // 设置审核状态
        setReviewStatus(reviewStatuses)

        // 不需要再调用 addSubmission，因为数据已经在数据库中
        // Context 初始化时会自动从数据库加载这些提交
        // 避免重复保存导致无限循环

        setIsInitialized(true)
      } catch (error) {
        console.error('[DutyManagerDashboard] Failed to load from database:', error)
        setIsInitialized(true)
      }
    }

    loadTaskStatusesFromDB()
  }, []) // 移除 addSubmission 依赖，避免循环
  
  // 保存状态到localStorage
  useEffect(() => {
    // 只在初始化后保存，避免保存初始状态
    if (!isInitialized) return
    
    // 只在有意义的状态改变时保存
    if (state.activeTasks.length > 0 || !state.isWaitingForTrigger) {
      const stateToSave = {
        // 只保存基本的页面状态，不保存任务完成状态
        activeTasks: state.activeTasks.map(task => ({
          id: task.id,
          title: task.title,
        })),
        targetPeriod: state.targetPeriod ? {
          id: state.targetPeriod.id,
          displayName: state.targetPeriod.displayName,
        } : undefined,
        isWaitingForTrigger: state.isWaitingForTrigger,
        currentTrigger: state.currentTrigger,
        noticeComments: state.noticeComments,
        isInClosingPeriod: state.isInClosingPeriod,
        // 重要：不保存 completedTaskIds 和 taskStatuses
      }
      console.log('[DutyManagerDashboard] Saving state:', stateToSave)
      localStorage.setItem('dutyManagerDashboardState', JSON.stringify(stateToSave))
    } else if (state.isWaitingForTrigger && state.activeTasks.length === 0) {
      // 如果回到等待状态，清除保存的状态
      console.log('[DutyManagerDashboard] Clearing saved state - back to waiting')
      localStorage.removeItem('dutyManagerDashboardState')
    }
  }, [state, isInitialized])

  // Note: CLEAR_ALL_STORAGE functionality has been removed as we're focusing on 
  // cross-device communication via Supabase Realtime

  // 监听审核状态变化，实时更新UI
  useEffect(() => {
    // 当审核状态变化时，触发组件重新渲染
    // reviewStatus 是从 DutyManagerContext 中获取的，会通过实时服务自动更新
    console.log('[DutyManagerDashboard] Review status updated:', reviewStatus)
  }, [reviewStatus])

  // 检查当前时段并自动加载任务
  useEffect(() => {
    // 如果已经有激活的任务（从localStorage恢复），不需要重新处理
    if (state.activeTasks.length > 0 && !state.isWaitingForTrigger) {
      return
    }
    
    // 获取当前时段
    const currentPeriod = getCurrentPeriod(testTime)
    
    // 如果当前是闭店时段（22:00-23:30），自动加载值班经理任务
    if (currentPeriod && currentPeriod.id === 'closing') {
      const targetPeriod = workflowPeriods.find(p => p.id === 'closing')
      if (!targetPeriod) return
      
      // 获取闭店时段的值班经理任务
      const dutyTasks = (targetPeriod.tasks as any).dutyManager || []
      
      // 获取所有值班经理任务（不再需要prerequisiteTrigger）
      const closingTasks = dutyTasks.filter((task: any) => {
        return task.role === 'DutyManager' && 
               task.uploadRequirement !== '审核'
      })
      
      if (closingTasks.length > 0) {
        setState(prev => ({
          ...prev,
          activeTasks: closingTasks,
          isWaitingForTrigger: false,
          currentTrigger: 'last-customer-left-dinner',
          targetPeriod: targetPeriod,
          isInClosingPeriod: true,
        }))
      }
    }
  }, [currentPeriod, state.activeTasks.length, state.isWaitingForTrigger, testTime])

  // 任务完成处理
  const handleTaskComplete = async (taskId: string, data: any) => {
    try {
      // 如果是重新提交，清除之前的驳回状态
      const isResubmit = reviewStatus[taskId]?.status === 'rejected'
      
      setState(prev => ({
        ...prev,
        // 如果是重新提交，先移除之前的完成记录
        completedTaskIds: isResubmit 
          ? [...prev.completedTaskIds.filter(id => id !== taskId), taskId]
          : [...prev.completedTaskIds, taskId],
        taskStatuses: {
          ...prev.taskStatuses,
          [taskId]: { completedAt: new Date(), overdue: false, evidence: data },
        },
      }))
      
      // 立即提交到Context，任务进入待审核状态
      const task = state.activeTasks.find(t => t.id === taskId)
      if (task) {
      console.log('[DutyManager] Submitting task:', taskId)
      
      // 处理照片数据格式
      let photos = []
      let photoGroups = []
      let uploadedPhotoUrls = []
      let uploadedPhotoGroups = []
      
      // 获取用户ID（使用mock ID）
      const userId = 'mock-user-' + Date.now()
      
      // 检查是否有照片组数据（新格式）
      // 注意：PhotoSubmissionDialog 返回的数据可能是嵌套的
      // 数据可能在 data.photoGroups 或 data.evidence.photoGroups 中
      const photoGroupsData = data.photoGroups || (data.evidence && data.evidence.photoGroups) || null
      
      console.log('[DutyManager] Raw submission data:', data)
      console.log('[DutyManager] Evidence data:', data.evidence)
      console.log('[DutyManager] PhotoGroups data:', photoGroupsData)
      
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
                console.error('Failed to upload photo to Storage')
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
        console.log('[DutyManager] After processing photoGroups format:', {
          photoGroups,
          photos,
          uploadedPhotoGroups,
          uploadedPhotoUrls
        })
      } else if ((data.evidence && Array.isArray(data.evidence)) || 
                 (data.evidence && data.evidence.evidence && Array.isArray(data.evidence.evidence))) {
        // 处理两种情况：直接的 evidence 数组，或嵌套在 data.evidence.evidence 中的数组
        const evidenceArray = Array.isArray(data.evidence) ? data.evidence : data.evidence.evidence
        console.log('[DutyManager] Processing evidence format:', evidenceArray)
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
            let photoData = typeof item === 'string' ? item : (item.photo || item.photoData || item)
            if (photoData && photoData.startsWith('data:')) {
              const result = await uploadPhoto(photoData, userId, taskId)
              if (result) {
                uploadedUrls.push(result.publicUrl)
              } else {
                console.error('Failed to upload photo to Storage')
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
      } else {
        // 没有找到任何照片数据
        console.warn('[DutyManager] No photo data found in submission:', {
          hasPhotoGroups: !!data.photoGroups,
          hasEvidence: !!data.evidence,
          hasPhotos: !!data.photos,
          dataKeys: Object.keys(data),
          fullData: data
        })
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
      
      console.log('[DutyManager] Photo upload complete, sending submission')
      console.log('[DutyManager] Submission data:', {
        taskId: submission.taskId,
        photoGroups: submission.content.photoGroups,
        photos: submission.content.photos,
        photoGroupsCount: submission.content.photoGroups?.length,
        photosCount: submission.content.photos?.length
      })
      
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
        console.log('[DutyManager] Task saved to database')
      } catch (dbError) {
        console.error('[DutyManager] Failed to save to database:', dbError)
        // 继续执行，不影响本地功能
      }
      */
      
      // 只调用 addSubmission，它会在 Context 中保存到数据库
      try {
        await addSubmission(submission)
      } catch (error) {
        console.error('[DutyManager] Failed to add submission:', error)
        throw error
      }
      }
    } catch (error) {
      console.error('Error in handleTaskComplete:', error)
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

  // 检查是否所有任务都已提交并审核通过
  useEffect(() => {
    if (state.activeTasks.length === 0) return
    
    // 检查所有任务是否都已审核通过
    const allApproved = state.activeTasks.every(task => 
      reviewStatus[task.id]?.status === 'approved'
    )
    
    if (allApproved) {
      // 所有任务都已审核通过，自动清除状态并返回等待界面
      setTimeout(() => {
        clearTrigger()
        setState(prev => ({
          ...prev,
          activeTasks: [],
          isWaitingForTrigger: true,
          currentTrigger: undefined,
          targetPeriod: undefined,
          completedTaskIds: [],
          taskStatuses: {},
          noticeComments: [],
          isInClosingPeriod: false,
        }))
        // 清除localStorage中的持久化状态
        localStorage.removeItem('dutyManagerDashboardState')
      }, 2000) // 延迟2秒让用户看到审核通过状态
    }
  }, [reviewStatus, state.activeTasks])

  // 返回到角色选择页面
  const handleBack = () => {
    // 值班经理数据现在通过数据库管理
    localStorage.removeItem('dutyManagerDashboardState') // 仅保留页面状态清理
    
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
                闭店时段（22:00）将自动开始值班任务
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
                    console.log('[DutyManagerDashboard] Processing submission for task:', sub.taskId, {
                      photoGroups: sub.content.photoGroups,
                      photos: sub.content.photos,
                      hasPhotoGroups: !!sub.content.photoGroups,
                      photoGroupsLength: sub.content.photoGroups?.length,
                      photosLength: sub.content.photos?.length
                    })
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
                        <Typography variant="body2">
                          {task.title}: {' '}
                          {!isSubmitted && <Chip label="未提交" size="small" />}
                          {isSubmitted && !status && <Chip label="待审核" color="warning" size="small" />}
                          {status?.status === 'approved' && <Chip label="已通过" color="success" size="small" />}
                          {status?.status === 'rejected' && <Chip label="待修改" color="error" size="small" />}
                        </Typography>
                        {status?.status === 'rejected' && status.reason && (
                          <Typography variant="caption" color="error" sx={{ ml: 2 }}>
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
              role="manager"
            />
          </Grid>
        </Grid>
      </Box>
    </Box>
  )
}

export default DutyManagerDashboard