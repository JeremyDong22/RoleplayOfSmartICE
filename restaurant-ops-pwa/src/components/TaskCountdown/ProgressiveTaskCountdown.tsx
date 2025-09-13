/**
 * Progressive Task Countdown Component
 * 渐进式任务倒计时组件 - 优先加载当前期间任务
 * Version: 1.0.0
 * Created: 2025-01-13
 */

import React, { useState, useEffect, lazy, Suspense } from 'react'
import {
  Box,
  Paper,
  Skeleton,
  Stack,
  Typography,
  LinearProgress,
  Fade,
  Card,
  CardContent,
  Chip
} from '@mui/material'
import {
  Timer as TimerIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material'
import { supabase } from '../../services/supabase'
import { restaurantConfigService } from '../../services/restaurantConfigService'
import type { TaskTemplate, WorkflowPeriod } from '../../types/task.types'

// 懒加载原始的 TaskCountdown 组件
const TaskCountdown = lazy(() => import('./TaskCountdown').then(module => ({
  default: module.TaskCountdown
})))

interface ProgressiveTaskCountdownProps {
  period: WorkflowPeriod | null
  tasks: TaskTemplate[]
  completedTaskIds: string[]
  testTime?: Date
  onComplete: (taskId: string, data: any) => void
  onReviewReject?: (taskId: string, reason: string) => void
  hideTimer?: boolean
  reviewStatus?: any
  previousSubmissions?: any
  renderNotices?: () => React.ReactNode
  delayMs?: number // 延迟加载的毫秒数
}

// 任务卡片骨架屏
const TaskCardSkeleton: React.FC = () => (
  <Card sx={{ minHeight: 200 }}>
    <CardContent>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" height={24} />
            <Skeleton variant="text" width="40%" height={16} />
          </Box>
        </Box>
        <Skeleton variant="rectangular" height={60} />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Skeleton variant="rectangular" width={80} height={32} />
          <Skeleton variant="rectangular" width={80} height={32} />
        </Box>
      </Stack>
    </CardContent>
  </Card>
)

// 任务倒计时骨架屏
const TaskCountdownSkeleton: React.FC = () => (
  <Paper
    sx={{
      p: 3,
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }}
  >
    {/* 时间显示骨架 */}
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Skeleton variant="circular" width={48} height={48} />
      <Box>
        <Skeleton variant="text" width={150} height={28} />
        <Skeleton variant="text" width={100} height={20} />
      </Box>
    </Box>

    {/* 任务卡片骨架 */}
    <Box sx={{ display: 'flex', gap: 2, overflow: 'hidden' }}>
      <TaskCardSkeleton />
      <Box sx={{ opacity: 0.6 }}>
        <TaskCardSkeleton />
      </Box>
      <Box sx={{ opacity: 0.3 }}>
        <TaskCardSkeleton />
      </Box>
    </Box>

    {/* 进度指示器 */}
    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
      {[1, 2, 3].map(i => (
        <Skeleton key={i} variant="circular" width={8} height={8} />
      ))}
    </Box>
  </Paper>
)

// 快速加载版本 - 只显示基本信息
const QuickTaskCountdown: React.FC<{
  period: WorkflowPeriod | null
  tasks: TaskTemplate[]
  completedTaskIds: string[]
  onLoadComplete?: () => void
}> = ({ period, tasks, completedTaskIds, onLoadComplete }) => {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    // 模拟快速加载完成
    const timer = setTimeout(() => {
      if (onLoadComplete) {
        onLoadComplete()
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [onLoadComplete])

  if (!period) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          当前无任务期间
        </Typography>
      </Paper>
    )
  }

  const regularTasks = tasks.filter(t => !t.isNotice)
  const completedCount = regularTasks.filter(t => completedTaskIds.includes(t.id)).length

  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        {/* 期间信息 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TimerIcon color="primary" />
          <Box>
            <Typography variant="h6">{period.displayName}</Typography>
            <Typography variant="body2" color="text.secondary">
              {period.startTime} - {period.endTime}
            </Typography>
          </Box>
        </Box>

        {/* 快速任务统计 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Chip
            icon={<AssignmentIcon />}
            label={`总任务: ${regularTasks.length}`}
            variant="outlined"
          />
          <Chip
            icon={<CheckCircleIcon />}
            label={`已完成: ${completedCount}`}
            color={completedCount === regularTasks.length ? 'success' : 'default'}
            variant="outlined"
          />
        </Box>

        {/* 加载提示 */}
        <Box>
          <Typography variant="caption" color="text.secondary">
            正在加载详细任务信息...
          </Typography>
          <LinearProgress sx={{ mt: 1 }} />
        </Box>
      </Stack>
    </Paper>
  )
}

export const ProgressiveTaskCountdown: React.FC<ProgressiveTaskCountdownProps> = ({
  period,
  tasks,
  completedTaskIds,
  testTime,
  onComplete,
  onReviewReject,
  hideTimer,
  reviewStatus,
  previousSubmissions,
  renderNotices,
  delayMs = 200 // 默认延迟200ms
}) => {
  console.log('[ProgressiveTaskCountdown] 🎯 Component rendered at', new Date().toISOString())
  console.log('[ProgressiveTaskCountdown] 📊 Delay setting:', delayMs, 'ms')

  const [isQuickLoaded, setIsQuickLoaded] = useState(false)
  const [isFullyLoaded, setIsFullyLoaded] = useState(false)
  const [currentPeriodTasks, setCurrentPeriodTasks] = useState<TaskTemplate[]>([])

  // 第一阶段：快速加载基本信息
  useEffect(() => {
    console.log('[ProgressiveTaskCountdown] ⏱️ Phase 1: Setting up quick load timer (50ms)')
    const timer = setTimeout(() => {
      console.log('[ProgressiveTaskCountdown] ✅ Phase 1 complete: Quick loaded at', new Date().toISOString())
      setIsQuickLoaded(true)
      // 设置当前期间的任务（如果已经有的话）
      if (tasks.length > 0) {
        console.log('[ProgressiveTaskCountdown] 📝 Found', tasks.length, 'tasks to display')
        setCurrentPeriodTasks(tasks)
      }
    }, 50) // 几乎立即显示

    return () => clearTimeout(timer)
  }, [tasks])

  // 第二阶段：加载完整组件
  useEffect(() => {
    if (!isQuickLoaded) return

    const loadFullComponent = async () => {
      // 如果还没有任务数据，尝试加载
      if (currentPeriodTasks.length === 0 && period) {
        try {
          const restaurantId = await restaurantConfigService.getRestaurantId()
          if (restaurantId) {
            const { data: periodTasks } = await supabase
              .from('roleplay_tasks')
              .select('*')
              .or(`restaurant_id.eq.${restaurantId},restaurant_id.is.null`)
              .eq('period_id', period.id)
              .order('sort_order')

            if (periodTasks) {
              setCurrentPeriodTasks(periodTasks as TaskTemplate[])
            }
          }
        } catch (error) {
          console.error('[ProgressiveTaskCountdown] Error loading tasks:', error)
        }
      }

      // 延迟加载完整组件
      console.log('[ProgressiveTaskCountdown] ⏱️ Phase 2: Setting up full load timer (' + delayMs + 'ms)')
      setTimeout(() => {
        console.log('[ProgressiveTaskCountdown] ✅ Phase 2 complete: Fully loaded at', new Date().toISOString())
        setIsFullyLoaded(true)
      }, delayMs)
    }

    loadFullComponent()
  }, [isQuickLoaded, period, delayMs, currentPeriodTasks.length])

  // 初始骨架屏
  if (!isQuickLoaded) {
    return <TaskCountdownSkeleton />
  }

  // 快速加载版本
  if (!isFullyLoaded) {
    return (
      <QuickTaskCountdown
        period={period}
        tasks={currentPeriodTasks}
        completedTaskIds={completedTaskIds}
        onLoadComplete={() => setIsFullyLoaded(true)}
      />
    )
  }

  // 完整组件（使用懒加载）
  return (
    <Suspense fallback={<TaskCountdownSkeleton />}>
      <Fade in={isFullyLoaded} timeout={300}>
        <Box>
          <TaskCountdown
            period={period}
            tasks={currentPeriodTasks.length > 0 ? currentPeriodTasks : tasks}
            completedTaskIds={completedTaskIds}
            testTime={testTime}
            onComplete={onComplete}
            onReviewReject={onReviewReject}
            hideTimer={hideTimer}
            reviewStatus={reviewStatus}
            previousSubmissions={previousSubmissions}
            renderNotices={renderNotices}
          />
        </Box>
      </Fade>
    </Suspense>
  )
}