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
}

const DutyManagerDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { currentTrigger, addSubmission, clearTrigger, reviewStatus } = useDutyManager()
  const [testTime, setTestTime] = useState<Date | null>(null)
  const [currentPeriod, setCurrentPeriod] = useState<WorkflowPeriod | null>(null)
  const [state, setState] = useState<DutyManagerState>({
    activeTasks: [],
    completedTaskIds: [],
    taskStatuses: {},
    noticeComments: [],
    isWaitingForTrigger: true,
    currentTrigger: undefined,
  })

  // 获取当前时段
  useEffect(() => {
    const period = getCurrentPeriod(testTime || undefined)
    setCurrentPeriod(period)
  }, [testTime])

  // Note: CLEAR_ALL_STORAGE functionality has been removed as we're focusing on 
  // cross-device communication via Supabase Realtime

  // 检查是否有触发的任务
  useEffect(() => {
    if (!currentTrigger) return

    // 根据触发类型获取对应的任务
    // last-customer-left-dinner触发closing时段的值班经理任务
    let targetPeriodId = ''
    if (currentTrigger.type === 'last-customer-left-dinner') {
      targetPeriodId = 'closing'
    } else if (currentTrigger.type === 'last-customer-left-lunch') {
      targetPeriodId = 'lunch-closing'
    }

    // 从workflowPeriods中找到目标时段
    const targetPeriod = workflowPeriods.find(p => p.id === targetPeriodId)
    
    if (!targetPeriod) {
      return
    }

    // 获取目标时段的值班经理任务
    const dutyTasks = (targetPeriod.tasks as any).dutyManager || []
    
    // 检查是否有被触发的任务
    const triggeredTasks = dutyTasks.filter((task: any) => {
      // 确保任务是值班经理任务，不是审核任务
      return task.prerequisiteTrigger === currentTrigger.type && 
             task.role === 'DutyManager' && 
             task.uploadRequirement !== '审核'
    })

    if (triggeredTasks.length > 0) {
      setState(prev => ({
        ...prev,
        activeTasks: triggeredTasks,
        isWaitingForTrigger: false,
        currentTrigger: currentTrigger.type,
        targetPeriod: targetPeriod,  // 保存目标时段
      }))
    }
  }, [currentTrigger])

  // 任务完成处理
  const handleTaskComplete = async (taskId: string, data: any) => {
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
      // console.log('DutyManager submitting task:', taskId, 'with data:', data)
      // console.log('Is resubmit?', isResubmit)
      
      // 处理照片数据格式
      let photos = []
      let photoGroups = []
      let uploadedPhotoUrls = []
      let uploadedPhotoGroups = []
      
      // 获取用户ID（使用mock ID）
      const userId = 'mock-user-' + Date.now()
      
      // 检查是否有照片组数据（新格式）
      if (data.photoGroups && Array.isArray(data.photoGroups)) {
        // 上传每个照片组的照片
        for (const group of data.photoGroups) {
          const uploadedUrls = []
          for (const photo of group.photos || []) {
            if (photo && photo.startsWith('data:')) {
              // 上传照片到Supabase Storage
              const result = await uploadPhoto(photo, userId, taskId)
              if (result) {
                uploadedUrls.push(result.publicUrl)
              } else {
                console.error('Failed to upload photo')
                uploadedUrls.push(photo) // 失败时保留原始base64
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
      } else if (data.evidence && Array.isArray(data.evidence)) {
        // 旧格式：evidence 是一个数组，需要转换为照片组
        const groupedByIndex: { [key: number]: any[] } = {}
        
        data.evidence.forEach((item: any) => {
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
                uploadedUrls.push(photoData)
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
            uploadedUrls.push(result ? result.publicUrl : photo)
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
      
      // console.log('Formatted submission:', submission)
      // console.log('Calling addSubmission...')
      addSubmission(submission)
      // console.log('addSubmission called')
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
          noticeComments: []
        }))
      }, 2000) // 延迟2秒让用户看到审核通过状态
    }
  }, [reviewStatus, state.activeTasks])

  // 登出处理
  const handleLogout = () => {
    // 清理值班经理相关的存储
    localStorage.removeItem('dutyManagerTrigger')
    localStorage.removeItem('dutyManagerSubmissions')
    localStorage.removeItem('dutyManagerReviewStatus')
    
    // 清除Context中的数据
    clearTrigger()
    
    navigate('/')
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
              onClick={handleLogout}
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
                下一阶段：等待前厅管理确认客人离开
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
            onClick={handleLogout}
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
                completedAt: status.completedAt,
                overdue: status.overdue
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