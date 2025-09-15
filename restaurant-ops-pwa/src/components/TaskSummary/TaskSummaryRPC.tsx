// TaskSummary 组件 RPC 版本 - 使用 RPC 获取统计数据
// Created: 2025-09-16
// 性能优化版本，将计算逻辑移至数据库端

import React, { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material'
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material'
import {
  getTaskSummaryStatsRPC,
  subscribeToTaskSummaryUpdates,
  type TaskSummaryStatsRPC
} from '../../services/taskSummaryServiceRPC'

interface TaskSummaryRPCProps {
  userId: string
  restaurantId: string
  role: 'manager' | 'chef' | 'duty_manager'
  onClose?: () => void
}

const TaskSummaryRPC: React.FC<TaskSummaryRPCProps> = ({
  userId,
  restaurantId,
  role,
  onClose
}) => {
  const [stats, setStats] = useState<TaskSummaryStatsRPC | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 订阅实时更新
    const unsubscribe = subscribeToTaskSummaryUpdates(
      userId,
      restaurantId,
      role,
      (newStats) => {
        setStats(newStats)
        setLoading(false)
        setError(null)
      }
    )

    // 错误处理
    const handleError = () => {
      setError('获取任务统计失败，请刷新重试')
      setLoading(false)
    }

    // 初始加载超时处理
    const timeout = setTimeout(() => {
      if (loading) {
        handleError()
      }
    }, 10000)

    return () => {
      unsubscribe()
      clearTimeout(timeout)
    }
  }, [userId, restaurantId, role])

  if (loading) {
    return (
      <Card sx={{ minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Card>
    )
  }

  if (error) {
    return (
      <Card sx={{ minHeight: 400, p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Card>
    )
  }

  if (!stats) {
    return null
  }

  const {
    currentPeriodTasks,
    previousPeriodsMissing,
    overallCompletionRate,
    currentPeriod
  } = stats

  // 根据完成率计算颜色
  const getProgressColor = (rate: number) => {
    if (rate >= 80) return 'success'
    if (rate >= 50) return 'warning'
    return 'error'
  }

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, overflow: 'auto' }}>
        {/* 当前时段信息 */}
        {currentPeriod.name && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              当前时段
            </Typography>
            <Typography variant="h6">
              {currentPeriod.name}
            </Typography>
          </Box>
        )}

        {/* 总体完成率 */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1" sx={{ flex: 1 }}>
              今日完成率
            </Typography>
            <Typography variant="h5" color={`${getProgressColor(overallCompletionRate)}.main`}>
              {overallCompletionRate.toFixed(0)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={overallCompletionRate}
            color={getProgressColor(overallCompletionRate)}
            sx={{ height: 8, borderRadius: 1 }}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* 当前时段任务 */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
            <AssignmentIcon sx={{ mr: 1, fontSize: 20 }} />
            当前时段任务
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Chip
              label={`总计: ${currentPeriodTasks.total}`}
              size="small"
              variant="outlined"
            />
            <Chip
              label={`已完成: ${currentPeriodTasks.completed}`}
              size="small"
              color="success"
              icon={<CheckCircleIcon />}
            />
            <Chip
              label={`待完成: ${currentPeriodTasks.pending}`}
              size="small"
              color={currentPeriodTasks.pending > 0 ? 'warning' : 'default'}
              icon={currentPeriodTasks.pending > 0 ? <WarningIcon /> : undefined}
            />
          </Box>
        </Box>

        {/* 缺失的历史任务 */}
        {previousPeriodsMissing.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box>
              <Typography
                variant="subtitle1"
                sx={{ mb: 1, display: 'flex', alignItems: 'center', color: 'warning.main' }}
              >
                <WarningIcon sx={{ mr: 1, fontSize: 20 }} />
                待补充任务 ({previousPeriodsMissing.length})
              </Typography>
              <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
                {previousPeriodsMissing.map((task, index) => (
                  <ListItem key={`${task.taskId}-${index}`} sx={{ py: 0.5 }}>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {task.taskTitle}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {task.periodName} • {task.submissionType || '未知类型'}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </>
        )}

        {/* 完美完成提示 */}
        {overallCompletionRate === 100 && previousPeriodsMissing.length === 0 && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
            <Typography variant="body2" color="success.dark" sx={{ display: 'flex', alignItems: 'center' }}>
              <CheckCircleIcon sx={{ mr: 1 }} />
              所有任务已完成！
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default TaskSummaryRPC