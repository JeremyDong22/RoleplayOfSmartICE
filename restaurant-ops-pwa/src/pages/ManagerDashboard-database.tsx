/**
 * Manager Dashboard - 数据库版本示例
 * 展示如何从 workflowParser 迁移到使用数据库
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Container, 
  AppBar, 
  Toolbar, 
  IconButton,
  Typography,
  CircularProgress,
  Alert,
  Box
} from '@mui/material'
import Grid from '@mui/material/Grid'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { TaskCountdown } from '../components/TaskCountdown/TaskCountdown'
import { TaskSummary } from '../components/TaskSummary'
import { EditableTime } from '../components/TimeControl/EditableTime'
import { ClosedPeriodDisplay } from '../components/ClosedPeriodDisplay/ClosedPeriodDisplay'

// 关键改动：使用 TaskDataContext 替代 workflowParser
import { useTaskData } from '../contexts/TaskDataContext'
import { getCurrentPeriodFromDatabase, getNextPeriodFromDatabase } from '../services/businessCycleService' // 保留工具函数
import type { TaskTemplate } from '../types/task.types' // 保留类型定义

import { saveState, loadState, clearState } from '../utils/persistenceManager'
import { useDutyManager, type DutyManagerSubmission } from '../contexts/DutyManagerContext'
import { broadcastService } from '../services/broadcastService'
import { getCurrentTestTime } from '../utils/globalTestTime'

export const ManagerDashboardDatabase: React.FC = () => {
  const navigate = useNavigate()
  
  // 🔄 关键改动：从 context 获取任务数据
  const { workflowPeriods, floatingTasks, isLoading, error, refresh } = useTaskData()
  
  // 原有的状态保持不变
  const [currentPeriod, setCurrentPeriod] = useState<WorkflowPeriod | null>(null)
  const [nextPeriod, setNextPeriod] = useState<WorkflowPeriod | null>(null)
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([])
  const [taskStatuses, setTaskStatuses] = useState<Record<string, any>>({})
  const [noticeComments, setNoticeComments] = useState<Record<string, string>>({})
  const [missingTasks, setMissingTasks] = useState<TaskTemplate[]>([])
  const [isManualClosing, setIsManualClosing] = useState(false)
  const [isWaitingForNextDay, setIsWaitingForNextDay] = useState(false)
  
  const manualClosingRef = useRef(false)
  const waitingRef = useRef(false)
  const { submitDutyManagerTask } = useDutyManager()

  // 测试时间
  const [testTime, setTestTime] = useState<Date>(getCurrentTestTime())

  // 加载保存的状态
  useEffect(() => {
    const savedState = loadState('manager')
    if (savedState) {
      setCompletedTaskIds(savedState.completedTaskIds)
      setTaskStatuses(savedState.taskStatuses)
      setNoticeComments(savedState.noticeComments)
      setMissingTasks(savedState.missingTasks)
      setIsManualClosing(savedState.isManualClosing)
      setIsWaitingForNextDay(savedState.isWaitingForNextDay)
      manualClosingRef.current = savedState.isManualClosing
      waitingRef.current = savedState.isWaitingForNextDay
    }
  }, [])

  // 更新期间 - 现在依赖于从数据库加载的 workflowPeriods
  useEffect(() => {
    if (!workflowPeriods.length) return // 等待数据加载
    
    const timeStr = testTime.toTimeString().slice(0, 5)
    const hours = testTime.getHours()
    
    // 日期变更检测逻辑保持不变...
    if (hours === 10 && testTime.getMinutes() < 30) {
      const savedState = loadState('manager')
      const lastSavedDate = savedState?.lastUpdated ? new Date(savedState.lastUpdated) : null
      const isNewDay = !lastSavedDate || lastSavedDate.getDate() !== testTime.getDate()
      
      if (isNewDay && (isWaitingForNextDay || waitingRef.current)) {
        clearState('manager')
        setCompletedTaskIds([])
        setTaskStatuses({})
        setNoticeComments({})
        setMissingTasks([])
        setIsManualClosing(false)
        setIsWaitingForNextDay(false)
        manualClosingRef.current = false
        waitingRef.current = false
        return
      }
    }

    // 期间更新逻辑保持不变...
    if (waitingRef.current || isWaitingForNextDay) {
      const current = getCurrentPeriod(workflowPeriods, timeStr)
      if (current?.id === 'opening') {
        setIsWaitingForNextDay(false)
        waitingRef.current = false
      } else {
        return
      }
    }

    if (manualClosingRef.current || isManualClosing) {
      if (currentPeriod?.id !== 'closing') {
        return
      }
    }

    const current = getCurrentPeriod(workflowPeriods, timeStr)
    const next = getNextPeriod(workflowPeriods, timeStr)
    
    setCurrentPeriod(current)
    setNextPeriod(next)

  }, [testTime, isManualClosing, currentPeriod?.id, isWaitingForNextDay, workflowPeriods])

  // 其他功能保持不变...
  const handleTaskComplete = useCallback((taskId: string, submission?: any) => {
    // 实现保持不变
  }, [])

  const handleLastCustomerLeft = useCallback(() => {
    // 实现保持不变
  }, [currentPeriod, completedTaskIds, taskStatuses])

  const handleTimeChange = useCallback((newTime: Date) => {
    setTestTime(newTime)
  }, [])

  // 🔄 处理加载和错误状态
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>正在从数据库加载任务数据...</Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="100vh">
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button variant="contained" onClick={refresh}>重新加载</Button>
      </Box>
    )
  }

  // 渲染逻辑保持不变
  return (
    <Container maxWidth={false} sx={{ p: 0, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate('/')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            餐厅管理系统 - 管理员
          </Typography>
          <EditableTime onTimeChange={handleTimeChange} />
        </Toolbar>
      </AppBar>

      {/* 其余渲染逻辑保持不变... */}
    </Container>
  )
}

// 导出说明：
// 这个文件展示了如何将 ManagerDashboard 从使用本地 workflowParser 
// 迁移到使用数据库驱动的 TaskDataContext
// 主要改动：
// 1. 导入 useTaskData hook
// 2. 从 context 获取 workflowPeriods 和 floatingTasks
// 3. 添加加载和错误状态处理
// 4. 其他业务逻辑保持不变