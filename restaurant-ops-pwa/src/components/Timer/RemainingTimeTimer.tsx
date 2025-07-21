// Redesigned countdown timer showing remaining time with urgency indicators
import { useState, useEffect, useRef } from 'react'
import { Box, Typography, CircularProgress, Paper, Chip, LinearProgress } from '@mui/material'
import type { Task } from '../../utils/taskParser'
import { getTimeRemaining } from '../../utils/taskParser'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import WarningIcon from '@mui/icons-material/Warning'

interface RemainingTimeTimerProps {
  currentTask: Task | null
  onTaskAlert: (task: Task, alertType: 'start' | 'warning' | 'overdue') => void
  testTime?: Date | null
}

export const RemainingTimeTimer: React.FC<RemainingTimeTimerProps> = ({ currentTask, onTaskAlert, testTime }) => {
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0, isOverdue: false, total: 0 })
  const [urgencyLevel, setUrgencyLevel] = useState<'normal' | 'warning' | 'urgent' | 'overdue'>('normal')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const alertsPlayedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    // Create audio element for alerts
    audioRef.current = new Audio('/notification.mp3')
    audioRef.current.volume = 0.7
  }, [])

  useEffect(() => {
    if (!currentTask) {
      setTimeRemaining({ hours: 0, minutes: 0, seconds: 0, isOverdue: false, total: 0 })
      setUrgencyLevel('normal')
      return
    }

    const updateTimer = () => {
      const remaining = getTimeRemaining(currentTask, testTime || undefined)
      setTimeRemaining(remaining)

      // Determine urgency level
      const totalMinutes = remaining.total / (1000 * 60)
      if (remaining.isOverdue) {
        setUrgencyLevel('overdue')
        playAlertIfNeeded('overdue', currentTask)
      } else if (totalMinutes <= 5) {
        setUrgencyLevel('urgent')
        playAlertIfNeeded('urgent', currentTask)
      } else if (totalMinutes <= 10) {
        setUrgencyLevel('warning')
        playAlertIfNeeded('warning', currentTask)
      } else {
        setUrgencyLevel('normal')
      }

      // Check if task just started
      const now = testTime || new Date()
      const startTime = currentTask.scheduledStartTime
      if (Math.abs(now.getTime() - startTime.getTime()) < 1000 && !alertsPlayedRef.current.has(`start-${currentTask.id}`)) {
        playAlertIfNeeded('start', currentTask)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [currentTask, onTaskAlert, testTime])

  const playAlertIfNeeded = (type: string, task: Task) => {
    const alertKey = `${type}-${task.id}`
    if (!alertsPlayedRef.current.has(alertKey)) {
      alertsPlayedRef.current.add(alertKey)
      playAlert()
      
      if (type === 'start') {
        onTaskAlert(task, 'start')
      } else if (type === 'warning' || type === 'urgent') {
        onTaskAlert(task, 'warning')
      } else if (type === 'overdue') {
        onTaskAlert(task, 'overdue')
      }
    }
  }

  const playAlert = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(err => {
        console.error('Failed to play audio:', err)
        // Fallback to browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('任务提醒 Task Alert', {
            body: currentTask ? `${currentTask.title} - 需要您的注意！` : 'Task requires attention!',
            icon: '/icon-192x192.png',
            vibrate: [200, 100, 200]
          })
        }
      })
    }
  }

  const formatTime = (hours: number, minutes: number, seconds: number): string => {
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getUrgencyColor = () => {
    switch (urgencyLevel) {
      case 'overdue':
        return '#d32f2f' // red
      case 'urgent':
        return '#f57c00' // orange
      case 'warning':
        return '#fbc02d' // yellow
      default:
        return '#388e3c' // green
    }
  }

  const getProgressValue = () => {
    if (!currentTask || timeRemaining.isOverdue) return 0
    
    const totalTaskTime = currentTask.scheduledEndTime.getTime() - currentTask.scheduledStartTime.getTime()
    const elapsed = totalTaskTime - timeRemaining.total
    return Math.max(0, Math.min(100, (elapsed / totalTaskTime) * 100))
  }

  const getStatusMessage = () => {
    if (!currentTask) return '暂无任务 No active task'
    if (timeRemaining.isOverdue) return '任务已逾期 Task Overdue!'
    if (urgencyLevel === 'urgent') return '紧急！请尽快完成 Urgent! Complete soon'
    if (urgencyLevel === 'warning') return '注意时间 Watch the time'
    return '正常进行中 On track'
  }

  return (
    <Paper
      elevation={3}
      sx={{
        p: 4,
        textAlign: 'center',
        background: urgencyLevel === 'overdue' 
          ? 'linear-gradient(45deg, #d32f2f 30%, #f44336 90%)'
          : urgencyLevel === 'urgent'
          ? 'linear-gradient(45deg, #f57c00 30%, #ff9800 90%)'
          : undefined,
        color: ['urgent', 'overdue'].includes(urgencyLevel) ? 'white' : undefined,
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background animation for urgent states */}
      {['urgent', 'overdue'].includes(urgencyLevel) && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle, transparent 20%, rgba(255,255,255,0.1) 21%)',
            backgroundSize: '10px 10px',
            animation: 'pulse 2s infinite',
            pointerEvents: 'none',
          }}
        />
      )}

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        {/* Time Display */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h1" component="div" sx={{ fontWeight: 'bold', fontSize: '4rem' }}>
            {timeRemaining.isOverdue ? '-' : ''}{formatTime(timeRemaining.hours, timeRemaining.minutes, timeRemaining.seconds)}
          </Typography>
          <Typography variant="h6" sx={{ mt: 1, opacity: 0.9 }}>
            剩余时间 Time Remaining
          </Typography>
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mb: 3 }}>
          <LinearProgress
            variant="determinate"
            value={getProgressValue()}
            sx={{
              height: 10,
              borderRadius: 5,
              backgroundColor: 'rgba(0,0,0,0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: getUrgencyColor(),
                borderRadius: 5,
              },
            }}
          />
        </Box>

        {/* Status */}
        <Chip
          icon={
            urgencyLevel === 'overdue' ? <WarningIcon /> :
            ['urgent', 'warning'].includes(urgencyLevel) ? <NotificationsActiveIcon /> :
            <AccessTimeIcon />
          }
          label={getStatusMessage()}
          color={
            urgencyLevel === 'overdue' ? 'error' :
            urgencyLevel === 'urgent' ? 'warning' :
            'success'
          }
          sx={{ mb: 3, animation: ['urgent', 'overdue'].includes(urgencyLevel) ? 'pulse 1s infinite' : undefined }}
        />

        {/* Task Info */}
        {currentTask && (
          <>
            <Typography variant="h5" gutterBottom>
              {currentTask.title}
            </Typography>
            {currentTask.description && (
              <Typography variant="body1" sx={{ mb: 2, opacity: 0.9 }}>
                {currentTask.description}
              </Typography>
            )}
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Chip
                size="small"
                label={currentTask.department}
                color={currentTask.department === '前厅' ? 'primary' : 'secondary'}
                variant="outlined"
              />
              <Chip
                size="small"
                icon={<AccessTimeIcon />}
                label={`${currentTask.scheduledStartTime.toLocaleTimeString('zh-CN', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })} - ${currentTask.scheduledEndTime.toLocaleTimeString('zh-CN', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}`}
                variant="outlined"
              />
            </Box>
          </>
        )}
      </Box>

      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.8; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </Paper>
  )
}