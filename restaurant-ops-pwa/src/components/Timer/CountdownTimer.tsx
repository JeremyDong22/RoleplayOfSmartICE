// Countdown timer component with audio alerts for task reminders
import type { FC } from 'react'
import { useState, useEffect, useRef } from 'react'
import { Box, Typography, CircularProgress, Paper, Chip } from '@mui/material'
import type { Database } from '../../types/database'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'

type Task = Database['public']['Tables']['tasks']['Row']

interface CountdownTimerProps {
  currentTask: Task | null
  onTaskAlert: (task: Task) => void
}

export const CountdownTimer: FC<CountdownTimerProps> = ({ currentTask, onTaskAlert }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [progress, setProgress] = useState<number>(100)
  const [isUrgent, setIsUrgent] = useState<boolean>(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const alertPlayedRef = useRef<boolean>(false)

  useEffect(() => {
    // Create audio element for alerts - simple beep sound
    audioRef.current = new Audio('/notification.mp3')
    audioRef.current.volume = 0.7
  }, [])

  useEffect(() => {
    if (!currentTask) {
      setTimeLeft(0)
      setProgress(100)
      setIsUrgent(false)
      alertPlayedRef.current = false
      return
    }

    const calculateTimeLeft = () => {
      const now = new Date()
      const startTime = new Date(currentTask.scheduled_start_time)
      const endTime = new Date(currentTask.scheduled_end_time)
      
      // If task hasn't started yet, show time until start
      if (now < startTime) {
        return Math.floor((startTime.getTime() - now.getTime()) / 1000)
      }
      
      // If task is ongoing, show time until end
      if (now >= startTime && now <= endTime) {
        return Math.floor((endTime.getTime() - now.getTime()) / 1000)
      }
      
      // Task is overdue
      return -1
    }

    const updateTimer = () => {
      const seconds = calculateTimeLeft()
      setTimeLeft(seconds)
      
      // Calculate progress
      if (currentTask && seconds >= 0) {
        const now = new Date()
        const startTime = new Date(currentTask.scheduled_start_time)
        const endTime = new Date(currentTask.scheduled_end_time)
        
        if (now < startTime) {
          // Before task starts
          setProgress(100)
        } else {
          // During task
          const totalDuration = endTime.getTime() - startTime.getTime()
          const elapsed = now.getTime() - startTime.getTime()
          setProgress(Math.max(0, 100 - (elapsed / totalDuration) * 100))
        }
      } else {
        setProgress(0)
      }
      
      // Check if urgent (less than 5 minutes)
      setIsUrgent(seconds > 0 && seconds < 300)
      
      // Play alert when task starts
      if (seconds === 0 && !alertPlayedRef.current) {
        alertPlayedRef.current = true
        playAlert()
        onTaskAlert(currentTask)
      }
    }

    // Initial calculation
    updateTimer()

    // Update every second
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [currentTask, onTaskAlert])

  const playAlert = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(err => {
        console.error('Failed to play audio:', err)
        // Fallback to browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('任务提醒 Task Alert', {
            body: `${currentTask?.title} - 现在开始 Start now!`,
            icon: '/icon-192x192.png',
            vibrate: [200, 100, 200]
          })
        }
      })
    }
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 0) return '已逾期 Overdue'
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusColor = () => {
    if (timeLeft < 0) return 'error'
    if (isUrgent) return 'warning'
    return 'primary'
  }

  return (
    <Paper
      elevation={3}
      sx={{
        p: 4,
        textAlign: 'center',
        background: isUrgent ? 'linear-gradient(45deg, #ff6b6b 30%, #ff8787 90%)' : undefined,
        color: isUrgent ? 'white' : undefined,
        transition: 'all 0.3s ease',
      }}
    >
      <Box sx={{ position: 'relative', display: 'inline-flex', mb: 3 }}>
        <CircularProgress
          variant="determinate"
          value={progress}
          size={200}
          thickness={4}
          color={getStatusColor()}
          sx={{
            transform: 'rotate(-90deg)',
            '& .MuiCircularProgress-circle': {
              strokeLinecap: 'round',
            },
          }}
        />
        <Box
          sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          <Typography variant="h2" component="div" color={isUrgent ? 'inherit' : 'text.primary'}>
            {formatTime(Math.abs(timeLeft))}
          </Typography>
          {isUrgent && (
            <NotificationsActiveIcon sx={{ fontSize: 40, mt: 1, animation: 'pulse 1s infinite' }} />
          )}
        </Box>
      </Box>
      
      {currentTask ? (
        <>
          <Typography variant="h5" gutterBottom>
            {currentTask.title}
          </Typography>
          {currentTask.description && (
            <Typography variant="body1" color={isUrgent ? 'inherit' : 'text.secondary'} sx={{ mb: 2 }}>
              {currentTask.description}
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Chip
              icon={<AccessTimeIcon />}
              label={`${new Date(currentTask.scheduled_start_time).toLocaleTimeString('zh-CN', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })} - ${new Date(currentTask.scheduled_end_time).toLocaleTimeString('zh-CN', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}`}
              color={getStatusColor()}
              variant={isUrgent ? 'filled' : 'outlined'}
            />
          </Box>
        </>
      ) : (
        <Typography variant="h6" color="text.secondary">
          暂无任务 No active task
        </Typography>
      )}
      
      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}
      </style>
    </Paper>
  )
}