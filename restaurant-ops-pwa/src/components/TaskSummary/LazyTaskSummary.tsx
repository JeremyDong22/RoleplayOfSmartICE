/**
 * Lazy Loading Task Summary Component
 * 延迟加载的任务统计组件 - 在其他组件加载后异步加载
 * Version: 1.0.0
 * Created: 2025-01-13
 */

import React, { useState, useEffect, lazy, Suspense } from 'react'
import {
  Box,
  Paper,
  Skeleton,
  Stack,
  LinearProgress,
  Typography,
  Fade
} from '@mui/material'
import { authService } from '../../services/authService'
import { getRestaurantId } from '../../services/restaurantConfigService'
import { getTaskSummaryStats } from '../../services/taskSummaryService'
import type { TaskTemplate } from '../../types/task.types'

// 懒加载原始的 TaskSummary 组件
const TaskSummary = lazy(() => import('./TaskSummary').then(module => ({
  default: module.TaskSummary
})))

interface LazyTaskSummaryProps {
  tasks: TaskTemplate[]
  taskStatuses: any[]
  completedTaskIds: string[]
  missingTasks: any[]
  onLateSubmit?: (taskId: string, data?: any) => void
  dbTaskStatuses?: any[]
  testTime?: Date
  role?: string
  delayMs?: number // 延迟加载的毫秒数
}

// 骨架屏组件
const TaskSummarySkeleton: React.FC = () => (
  <Paper
    sx={{
      height: '100%',
      p: 2,
      display: 'flex',
      flexDirection: 'column'
    }}
  >
    <Stack spacing={2}>
      {/* 标题骨架 */}
      <Box>
        <Skeleton variant="text" width="60%" height={32} />
        <Skeleton variant="text" width="40%" height={20} sx={{ mt: 1 }} />
      </Box>

      {/* 进度条骨架 */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Skeleton variant="text" width={80} />
          <Skeleton variant="text" width={40} />
        </Box>
        <Skeleton variant="rectangular" height={8} sx={{ borderRadius: 1 }} />
      </Box>

      {/* 统计数据骨架 */}
      <Stack spacing={1}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton variant="text" width="70%" />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton variant="text" width="60%" />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton variant="text" width="50%" />
        </Box>
      </Stack>

      {/* 任务列表骨架 */}
      <Box>
        <Skeleton variant="text" width="40%" height={24} sx={{ mb: 1 }} />
        {[1, 2, 3].map(i => (
          <Skeleton
            key={i}
            variant="rectangular"
            height={48}
            sx={{ mb: 1, borderRadius: 1 }}
          />
        ))}
      </Box>
    </Stack>
  </Paper>
)

// 加载中状态组件
const LoadingTaskSummary: React.FC<{ progress?: number }> = ({ progress = 0 }) => (
  <Paper
    sx={{
      height: '100%',
      p: 2,
      display: 'flex',
      flexDirection: 'column'
    }}
  >
    <Stack spacing={2}>
      <Typography variant="h6" color="text.secondary">
        任务统计
      </Typography>
      <Box>
        <Typography variant="caption" color="text.secondary" gutterBottom>
          正在加载统计数据...
        </Typography>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ mt: 1 }}
        />
      </Box>
      <TaskSummarySkeleton />
    </Stack>
  </Paper>
)

export const LazyTaskSummary: React.FC<LazyTaskSummaryProps> = ({
  tasks,
  taskStatuses,
  completedTaskIds,
  missingTasks,
  onLateSubmit,
  dbTaskStatuses,
  testTime,
  role,
  delayMs = 500 // 默认延迟500ms
}) => {
  console.log('[LazyTaskSummary] 🎯 Component rendered at', new Date().toISOString())
  console.log('[LazyTaskSummary] 📊 Delay setting:', delayMs, 'ms')

  const [shouldLoad, setShouldLoad] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadProgress, setLoadProgress] = useState(0)
  const [statsData, setStatsData] = useState<any>(null)

  useEffect(() => {
    // 设置延迟加载
    console.log('[LazyTaskSummary] ⏱️ Setting up load timer (' + delayMs + 'ms)')
    const timer = setTimeout(() => {
      console.log('[LazyTaskSummary] ✅ Timer fired, starting load at', new Date().toISOString())
      setShouldLoad(true)
      setLoadProgress(30)
    }, delayMs)

    return () => clearTimeout(timer)
  }, [delayMs])

  useEffect(() => {
    if (!shouldLoad) return

    const loadStats = async () => {
      try {
        console.log('[LazyTaskSummary] 📦 Starting stats load at', new Date().toISOString())
        setLoadProgress(50)

        // 获取当前用户和餐厅信息
        const currentUser = authService.getCurrentUser()
        const restaurantId = await getRestaurantId()

        if (currentUser && restaurantId) {
          setLoadProgress(70)

          // 加载统计数据
          const stats = await getTaskSummaryStats(
            currentUser.id,
            restaurantId,
            role || 'manager',
            testTime
          )

          setStatsData(stats)
          setLoadProgress(100)
          console.log('[LazyTaskSummary] 📊 Stats loaded successfully')
        }

        console.log('[LazyTaskSummary] ✅ Loading complete at', new Date().toISOString())
        setIsLoading(false)
      } catch (error) {
        console.error('[LazyTaskSummary] Error loading stats:', error)
        setIsLoading(false)
      }
    }

    loadStats()
  }, [shouldLoad, role, testTime])

  // 在延迟期间显示骨架屏
  if (!shouldLoad) {
    return <TaskSummarySkeleton />
  }

  // 正在加载时显示加载进度
  if (isLoading && !statsData) {
    return <LoadingTaskSummary progress={loadProgress} />
  }

  // 使用 Suspense 和 Fade 动画加载真实组件
  return (
    <Suspense fallback={<TaskSummarySkeleton />}>
      <Fade in={!isLoading} timeout={300}>
        <Box sx={{ height: '100%' }}>
          <TaskSummary
            tasks={tasks}
            taskStatuses={taskStatuses}
            completedTaskIds={completedTaskIds}
            missingTasks={missingTasks}
            onLateSubmit={onLateSubmit}
            dbTaskStatuses={dbTaskStatuses}
            testTime={testTime}
            role={role}
            useDatabase={true}
          />
        </Box>
      </Fade>
    </Suspense>
  )
}