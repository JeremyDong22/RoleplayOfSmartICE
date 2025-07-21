// 值班经理工作台页面
import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  Container,
  AppBar,
  Toolbar,
  IconButton,
  CircularProgress,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useNavigate } from 'react-router-dom'
import type { TaskTemplate, WorkflowPeriod } from '../utils/workflowParser'
import { getCurrentPeriod, workflowPeriods } from '../utils/workflowParser'
import { EditableTime } from '../components/TimeControl/EditableTime'
import { TaskCountdown } from '../components/TaskCountdown/TaskCountdown'
import FloatingTaskCard from '../components/FloatingTaskCard/FloatingTaskCard'
import { TaskSummary } from '../components/TaskSummary/TaskSummary'
import { saveState, loadState, clearState } from '../utils/persistenceManager'
import { useDutyManager } from '../contexts/DutyManagerContext'

interface DutyManagerState {
  activeTasks: TaskTemplate[]
  completedTaskIds: string[]
  taskStatuses: { [key: string]: { completedAt: Date; overdue: boolean } }
  noticeComments: { [key: string]: string }
  isWaitingForTrigger: boolean
  currentTrigger?: 'last-customer-left-lunch' | 'last-customer-left-dinner'
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
    noticeComments: {},
    isWaitingForTrigger: true,
    currentTrigger: undefined,
  })

  // 获取当前时段
  useEffect(() => {
    const period = getCurrentPeriod(testTime || undefined)
    setCurrentPeriod(period)
  }, [testTime])

  // 检查是否有触发的任务
  useEffect(() => {
    if (!currentPeriod || !currentTrigger) return

    // 获取当前时段的值班经理任务
    const dutyTasks = currentPeriod.tasks.dutyManager || []
    
    // 检查是否有被触发的任务
    const triggeredTasks = dutyTasks.filter(task => {
      return task.prerequisiteTrigger === currentTrigger.type
    })

    if (triggeredTasks.length > 0) {
      setState(prev => ({
        ...prev,
        activeTasks: triggeredTasks,
        isWaitingForTrigger: false,
        currentTrigger: currentTrigger.type,
      }))
    }
  }, [currentPeriod, currentTrigger])

  // 任务完成处理
  const handleTaskComplete = (taskId: string) => {
    setState(prev => ({
      ...prev,
      completedTaskIds: [...prev.completedTaskIds, taskId],
      taskStatuses: {
        ...prev.taskStatuses,
        [taskId]: { completedAt: new Date(), overdue: false },
      },
    }))
  }

  // 提交值班记录
  const handleSubmitDutyRecord = () => {
    // 将任务提交到Context供Manager审核
    state.activeTasks.forEach(task => {
      const submission = {
        taskId: task.id,
        taskTitle: task.title,
        submittedAt: new Date(),
        content: {
          text: `已完成${task.title}任务`,
          photos: [], // 实际应用中从任务状态中获取
          amount: task.title.includes('营业款') ? 12580 : undefined, // 示例金额
        },
      }
      addSubmission(submission)
    })
    
    console.log('提交值班记录', {
      period: currentPeriod?.displayName,
      completedTasks: state.completedTaskIds,
      taskStatuses: state.taskStatuses,
    })
    
    // 清除当前触发，重置状态
    clearTrigger()
    setState(prev => ({
      ...prev,
      activeTasks: [],
      isWaitingForTrigger: true,
      currentTrigger: undefined,
      completedTaskIds: [],
      taskStatuses: {},
    }))
  }

  // 登出处理
  const handleLogout = () => {
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
            <EditableTime onTimeChange={setTestTime} />
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
            值班经理 - {currentPeriod?.displayName || ''}
          </Typography>
          <EditableTime onTimeChange={setTestTime} />
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <Grid container sx={{ height: '100%' }}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Box sx={{ height: '100%', p: 2, overflow: 'auto' }}>
              <TaskCountdown
                currentPeriod={currentPeriod}
                currentTasks={activeTasks}
                completedTaskIds={state.completedTaskIds}
                taskStatuses={state.taskStatuses}
                noticeComments={state.noticeComments}
                onTaskComplete={handleTaskComplete}
                onNoticeComment={(taskId, comment) => {
                  setState(prev => ({
                    ...prev,
                    noticeComments: { ...prev.noticeComments, [taskId]: comment },
                  }))
                }}
                testTime={testTime}
                allTasksCompleted={allTasksCompleted}
                missingTasks={[]}
                onAdvancePeriod={() => {}}
                role="duty-manager"
              />

              {/* 显示驳回状态 */}
              {Object.entries(reviewStatus).map(([taskId, status]) => {
                if (status.status === 'rejected' && state.activeTasks.some(t => t.id === taskId)) {
                  return (
                    <Box 
                      key={taskId}
                      sx={{ 
                        mt: 2, 
                        p: 2, 
                        bgcolor: 'error.50',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'error.main'
                      }}
                    >
                      <Typography variant="h6" color="error.main" gutterBottom>
                        任务被驳回
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        驳回原因：{status.reason}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        驳回时间：{status.reviewedAt?.toLocaleString('zh-CN')}
                      </Typography>
                    </Box>
                  )
                }
                return null
              })}
              
              {/* 提交按钮 */}
              {allTasksCompleted && (
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: 'error.main',
                      mb: 2,
                      fontWeight: 'bold'
                    }}
                  >
                    提交{currentPeriod?.id === 'lunch-closing' ? '午市' : '晚市'}值班记录
                  </Typography>
                  <Box
                    sx={{
                      bgcolor: 'error.main',
                      color: 'white',
                      p: 3,
                      borderRadius: 2,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'error.dark' },
                    }}
                    onClick={handleSubmitDutyRecord}
                  >
                    <Typography variant="h6">
                      {Object.values(reviewStatus).some(s => s.status === 'rejected') 
                        ? '重新提交值班记录' 
                        : '点击提交值班记录'}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TaskSummary
              currentPeriod={currentPeriod}
              completedTaskIds={state.completedTaskIds}
              role="DutyManager"
              missingTasks={[]}
              testTime={testTime}
            />
          </Grid>
        </Grid>
      </Box>
    </Box>
  )
}

export default DutyManagerDashboard