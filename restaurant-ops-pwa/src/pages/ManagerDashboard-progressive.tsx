/**
 * Progressive Manager Dashboard
 * 渐进式加载的管理员仪表板 - 优化加载性能
 * Version: 1.0.0
 * Created: 2025-01-13
 *
 * 加载顺序：
 * 1. 立即显示：顶部导航栏和时间控件
 * 2. 200ms内：当前任务卡片
 * 3. 500ms内：任务统计面板
 * 4. 后台加载：其他数据
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Paper,
  Alert,
  AlertTitle,
  Fade,
  Stack,
  LinearProgress
} from '@mui/material'
import Grid from '@mui/material/Grid'
import {
  ArrowBack as ArrowBackIcon,
  WbSunny as SunIcon,
  NightsStay as MoonIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material'

// 渐进式加载组件
import { useProgressiveTask, ProgressiveTaskProvider, LoadingPhase } from '../contexts/ProgressiveTaskContext'
import { IndependentEditableTime } from '../components/TimeControl/IndependentEditableTime'
import { ProgressiveTaskCountdown } from '../components/TaskCountdown/ProgressiveTaskCountdown'
import { LazyTaskSummary } from '../components/TaskSummary/LazyTaskSummary'
import { ClosedPeriodDisplay } from '../components/ClosedPeriodDisplay/ClosedPeriodDisplay'
import { authService } from '../services/authService'
import { getCurrentTestTime } from '../utils/globalTestTime'

// 非营业时间显示组件
const NotInBusinessDisplay: React.FC<{ nextPeriod: any }> = ({ nextPeriod }) => (
  <Container maxWidth="lg" sx={{ mt: 4 }}>
    <Paper
      sx={{
        p: 6,
        textAlign: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}
    >
      <MoonIcon sx={{ fontSize: 64, mb: 2 }} />
      <Typography variant="h3" gutterBottom>
        非营业时间
      </Typography>
      <Typography variant="h6" sx={{ mb: 4 }}>
        餐厅当前未营业
      </Typography>
      {nextPeriod && (
        <Alert
          severity="info"
          sx={{
            maxWidth: 400,
            mx: 'auto',
            backgroundColor: 'rgba(255,255,255,0.9)'
          }}
        >
          <AlertTitle>下一个营业期间</AlertTitle>
          <Typography>
            {nextPeriod.displayName} - {nextPeriod.startTime}
          </Typography>
        </Alert>
      )}
    </Paper>
  </Container>
)

// 加载进度显示组件
const LoadingProgress: React.FC<{ phase: LoadingPhase, progress: number }> = ({ phase, progress }) => {
  const getPhaseText = () => {
    switch (phase) {
      case LoadingPhase.CHECKING_HOURS:
        return '检查营业状态...'
      case LoadingPhase.LOADING_CURRENT:
        return '加载当前任务...'
      case LoadingPhase.LOADING_STATS:
        return '加载统计数据...'
      default:
        return '准备就绪'
    }
  }

  return (
    <Box sx={{ position: 'fixed', top: 64, left: 0, right: 0, zIndex: 1200 }}>
      <LinearProgress variant="determinate" value={progress} />
      <Box sx={{ textAlign: 'center', py: 0.5, bgcolor: 'background.paper' }}>
        <Typography variant="caption" color="text.secondary">
          {getPhaseText()}
        </Typography>
      </Box>
    </Box>
  )
}

// Dashboard 内容组件（需要在 Provider 内部）
const DashboardContent: React.FC = () => {
  console.log('[DashboardContent] 🎯 Component rendered at', new Date().toISOString())

  const navigate = useNavigate()
  const {
    isInBusinessHours,
    currentPeriod,
    nextPeriod,
    loadingPhase,
    loadingProgress,
    currentPeriodTasks,
    currentPeriodLoading,
    statsData,
    statsLoading,
    refresh
  } = useProgressiveTask()

  console.log('[DashboardContent] 📊 Loading state:', {
    phase: loadingPhase,
    progress: loadingProgress + '%',
    inBusiness: isInBusinessHours,
    currentPeriodLoading,
    statsLoading,
    tasksCount: currentPeriodTasks.length
  })

  const [testTime, setTestTime] = useState<Date | undefined>(getCurrentTestTime() || undefined)
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([])
  const [taskStatuses, setTaskStatuses] = useState<any[]>([])
  const [missingTasks, setMissingTasks] = useState<any[]>([])
  const [dbTaskStatuses, setDbTaskStatuses] = useState<any[]>([])

  // 获取当前用户
  const currentUser = authService.getCurrentUser()

  const handleTaskComplete = useCallback((taskId: string, data: any) => {
    console.log('Task completed:', taskId, data)
    setCompletedTaskIds(prev => [...prev, taskId])
    setTaskStatuses(prev => [
      ...prev.filter(s => s.taskId !== taskId),
      {
        taskId,
        completed: true,
        completedAt: new Date(),
        evidence: data
      }
    ])
  }, [])

  const handleLateSubmit = useCallback((taskId: string, data?: any) => {
    console.log('Late submit:', taskId, data)
    setCompletedTaskIds(prev => [...prev, taskId])
    setMissingTasks(prev => prev.filter(t => t.task.id !== taskId))
  }, [])

  const handleTimeChange = useCallback((date: Date) => {
    setTestTime(date)
    // 时间改变时刷新数据
    refresh()
  }, [refresh])

  const handleResetTasks = useCallback(() => {
    setCompletedTaskIds([])
    setTaskStatuses([])
    setMissingTasks([])
    setDbTaskStatuses([])
    refresh()
  }, [refresh])

  // 如果不在营业时间，显示等待界面
  if (!isInBusinessHours) {
    return (
      <>
        <AppBar position="static">
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={() => navigate('/')}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              餐厅管理系统 - 渐进式加载版
            </Typography>
            <IndependentEditableTime
              onTimeChange={handleTimeChange}
              onResetTasks={handleResetTasks}
            />
          </Toolbar>
        </AppBar>
        <NotInBusinessDisplay nextPeriod={nextPeriod} />
      </>
    )
  }

  // 在营业时间内，显示渐进式加载的界面
  return (
    <>
      {/* 顶部导航 - 立即显示 */}
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate('/')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            餐厅管理系统 - 管理员 (渐进式)
          </Typography>
          {/* 独立的时间组件，不依赖任何Context */}
          <IndependentEditableTime
            onTimeChange={handleTimeChange}
            onResetTasks={handleResetTasks}
          />
        </Toolbar>
      </AppBar>

      {/* 加载进度提示 */}
      {loadingPhase !== LoadingPhase.COMPLETE && (
        <LoadingProgress phase={loadingPhase} progress={loadingProgress} />
      )}

      <Container maxWidth={false} sx={{ mt: 2, mb: 2 }}>
        <Grid container spacing={2}>
          {/* 左侧：当前任务 - 200ms内加载 */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Fade in={!currentPeriodLoading} timeout={300}>
              <Box>
                {currentPeriod ? (
                  <ProgressiveTaskCountdown
                    period={currentPeriod}
                    tasks={currentPeriodTasks}
                    completedTaskIds={completedTaskIds}
                    testTime={testTime}
                    onComplete={handleTaskComplete}
                    delayMs={200}
                  />
                ) : (
                  <ClosedPeriodDisplay
                    nextPeriod={nextPeriod}
                    testTime={testTime}
                  />
                )}
              </Box>
            </Fade>
          </Grid>

          {/* 右侧：任务统计 - 500ms内加载 */}
          <Grid size={{ xs: 12, md: 4 }}>
            <LazyTaskSummary
              tasks={currentPeriodTasks}
              taskStatuses={taskStatuses}
              completedTaskIds={completedTaskIds}
              missingTasks={missingTasks}
              onLateSubmit={handleLateSubmit}
              dbTaskStatuses={dbTaskStatuses}
              testTime={testTime}
              role="manager"
              delayMs={500}
            />
          </Grid>
        </Grid>

        {/* 底部状态信息 */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Typography variant="caption" color="text.secondary">
              加载阶段: {loadingPhase}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              进度: {loadingProgress}%
            </Typography>
            {statsData && (
              <Typography variant="caption" color="text.secondary">
                完成率: {statsData.completionRate.toFixed(1)}%
              </Typography>
            )}
          </Stack>
        </Box>
      </Container>
    </>
  )
}

// 主组件 - 包装在 Provider 中
export const ManagerDashboardProgressive: React.FC = () => {
  console.log('[ManagerDashboardProgressive] 🚀 Main component mounted at', new Date().toISOString())

  return (
    <ProgressiveTaskProvider>
      <DashboardContent />
    </ProgressiveTaskProvider>
  )
}