// Task countdown component with separate displays for tasks and notices
import React, { useState, useEffect } from 'react'
import {
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material'
import {
  Timer as TimerIcon,
  CheckCircleOutline,
  PhotoCamera,
  Videocam,
  TextFields,
  Comment,
  Assignment,
  CheckCircle,
  Announcement,
  ChevronRight
} from '@mui/icons-material'
import type { TaskTemplate, WorkflowPeriod } from '../../utils/workflowParser'

interface TaskCountdownProps {
  period: WorkflowPeriod
  tasks: TaskTemplate[]
  completedTaskIds: string[]
  testTime?: Date
  onComplete: (taskId: string, data: any) => void
  onComment: (noticeId: string, comment: string) => void
  onLastCustomerLeft?: () => void
  onClosingComplete?: () => void
}

export const TaskCountdown: React.FC<TaskCountdownProps> = ({
  period,
  tasks,
  completedTaskIds,
  testTime,
  onComplete,
  onComment,
  onLastCustomerLeft,
  onClosingComplete
}) => {
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [showSwipeCard, setShowSwipeCard] = useState(true) // Always show for pre-closing
  const [currentTime, setCurrentTime] = useState<Date>(testTime || new Date())
  const prevPeriodRef = React.useRef(period.id)
  
  console.log('[TaskCountdown] Render:', {
    periodId: period.id,
    periodName: period.displayName,
    showSwipeCard,
    hasOnLastCustomerLeft: !!onLastCustomerLeft,
    testTime: testTime?.toLocaleTimeString(),
    shouldShowSwipe: period.id === 'pre-closing' && showSwipeCard && !!onLastCustomerLeft,
    timestamp: new Date().toISOString()
  })
  
  // Separate tasks and notices
  const regularTasks = tasks.filter(t => !t.isNotice)
  const notices = tasks.filter(t => t.isNotice)
  
  // Find the current task (first uncompleted task)
  const currentTask = regularTasks.find(task => !completedTaskIds.includes(task.id))
  const allTasksCompleted = regularTasks.length > 0 && regularTasks.every(task => completedTaskIds.includes(task.id))
  
  // Reset swipe card when entering pre-closing from another period
  useEffect(() => {
    if (period.id === 'pre-closing' && onLastCustomerLeft && prevPeriodRef.current !== 'pre-closing') {
      console.log('Transitioning TO pre-closing period, showing swipe card')
      setShowSwipeCard(true)
    }
    
    // Update ref for next render
    prevPeriodRef.current = period.id
  }, [period.id, onLastCustomerLeft])
  
  // Update currentTime for pre-closing/closing periods
  useEffect(() => {
    if (period.id === 'pre-closing' || period.id === 'closing') {
      // Update immediately when testTime changes
      setCurrentTime(testTime || new Date())
      console.log(`${period.id} time updated:`, (testTime || new Date()).toLocaleTimeString())
    }
  }, [period.id, testTime])
  
  // Calculate time remaining for countdown periods
  useEffect(() => {
    const calculateTime = () => {
      const now = testTime || new Date()
      
      if (period.id === 'pre-closing' || period.id === 'closing') {
        // For pre-closing and closing, update current time display
        setCurrentTime(now)
        return
      }
      
      // For other periods, calculate countdown
      const [endHour, endMinute] = period.endTime.split(':').map(Number)
      const endTime = new Date(now)
      endTime.setHours(endHour, endMinute, 0, 0)
      
      const total = endTime.getTime() - now.getTime()
      
      // Debug log for all periods
      console.log(`${period.id} countdown update:`, {
        testTime: testTime?.toLocaleTimeString() || 'none',
        now: now.toLocaleTimeString(),
        endTime: endTime.toLocaleTimeString(),
        periodEndTime: period.endTime,
        total: total,
        totalMinutes: Math.floor(total / (1000 * 60)),
        totalSeconds: Math.floor(total / 1000)
      })
      
      if (total <= 0) {
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0 })
        return
      }
      
      const hours = Math.floor(total / (1000 * 60 * 60))
      const minutes = Math.floor((total / (1000 * 60)) % 60)
      const seconds = Math.floor((total / 1000) % 60)
      
      setTimeRemaining({ hours, minutes, seconds })
    }
    
    calculateTime()
    const interval = setInterval(calculateTime, 1000)
    return () => clearInterval(interval)
  }, [period.id, period.endTime, testTime])
  
  // Calculate progress
  const calculateProgress = () => {
    const now = testTime || new Date()
    const [startHour, startMinute] = period.startTime.split(':').map(Number)
    const [endHour, endMinute] = period.endTime.split(':').map(Number)
    
    const start = new Date(now)
    start.setHours(startHour, startMinute, 0, 0)
    
    const end = new Date(now)
    end.setHours(endHour, endMinute, 0, 0)
    
    const total = end.getTime() - start.getTime()
    const elapsed = now.getTime() - start.getTime()
    
    return Math.min(100, Math.max(0, (elapsed / total) * 100))
  }
  
  // Get urgency level
  const getUrgencyLevel = () => {
    // Pre-closing and closing periods don't have urgency
    if (period.id === 'pre-closing' || period.id === 'closing') return 'normal'
    
    const totalMinutes = timeRemaining.hours * 60 + timeRemaining.minutes
    const totalSeconds = totalMinutes * 60 + timeRemaining.seconds
    
    // Only show warning when actually at or below 5 minutes (300 seconds)
    if (totalSeconds <= 300 && totalSeconds > 60) return 'warning'
    if (totalSeconds <= 60) return 'critical'
    return 'normal'
  }
  
  const urgencyLevel = getUrgencyLevel()
  
  return (
    <>
      {/* Period Timer */}
      <Paper 
        elevation={3}
        sx={{
          p: 3,
          mb: 3,
          backgroundColor: theme => 
            urgencyLevel === 'critical' ? alpha(theme.palette.error.main, 0.05) :
            urgencyLevel === 'warning' ? alpha(theme.palette.warning.main, 0.05) :
            'background.paper',
          border: theme => 
            urgencyLevel === 'critical' ? `2px solid ${theme.palette.error.main}` :
            urgencyLevel === 'warning' ? `2px solid ${theme.palette.warning.main}` :
            'none'
        }}
      >
        <Box textAlign="center">
          <Typography variant="h6" gutterBottom color="text.secondary">
            {period.displayName}
          </Typography>
          
          <Box display="flex" justifyContent="center" alignItems="center" gap={2} mb={2}>
            <TimerIcon 
              sx={{ 
                fontSize: 40,
                color: urgencyLevel === 'critical' ? 'error.main' : 
                       urgencyLevel === 'warning' ? 'warning.main' : 
                       'primary.main'
              }} 
            />
            <Typography 
              variant="h2" 
              fontWeight="bold"
              color={
                (period.id === 'pre-closing' || period.id === 'closing') ? 'text.primary' :
                urgencyLevel === 'critical' ? 'error.main' : 
                urgencyLevel === 'warning' ? 'warning.main' : 
                'text.primary'
              }
            >
              {(period.id === 'pre-closing' || period.id === 'closing')
                ? currentTime.toLocaleTimeString('zh-CN', { hour12: false })
                : `${String(timeRemaining.hours).padStart(2, '0')}:${String(timeRemaining.minutes).padStart(2, '0')}:${String(timeRemaining.seconds).padStart(2, '0')}`
              }
            </Typography>
          </Box>
          
          <LinearProgress 
            variant="determinate" 
            value={(period.id === 'pre-closing' || period.id === 'closing') ? 100 : calculateProgress()} 
            sx={{ 
              height: 8, 
              borderRadius: 4,
              backgroundColor: theme => alpha(theme.palette.primary.main, 0.1)
            }}
          />
        </Box>
      </Paper>
      
      {/* Tasks Container - Only show if there are tasks */}
      {regularTasks.length > 0 && (
        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Assignment color="primary" />
            <Typography variant="h6">
              当前任务 Current Task
            </Typography>
          </Box>
          
          {!allTasksCompleted ? (
            // Show current task only
            currentTask && (
              <Box>
                <Typography variant="h5" gutterBottom fontWeight="bold">
                  {currentTask.title}
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  {currentTask.description}
                </Typography>
                
                {/* Requirements */}
                <Box display="flex" gap={1} mb={3} flexWrap="wrap">
                  {currentTask.requiresPhoto && (
                    <Chip
                      icon={<PhotoCamera />}
                      label="需要照片"
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                  {currentTask.requiresVideo && (
                    <Chip
                      icon={<Videocam />}
                      label="需要视频"
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                  {currentTask.requiresText && (
                    <Chip
                      icon={<TextFields />}
                      label="需要文字说明"
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                </Box>
                
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                  startIcon={<CheckCircleOutline />}
                  onClick={() => onComplete(currentTask.id, {})}
                >
                  完成任务 Complete Task
                </Button>
              </Box>
            )
          ) : (
            // All tasks completed
            <Box textAlign="center" py={2}>
              <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
              <Typography variant="h6" color="success.main">
                所有任务已完成
              </Typography>
              <Typography variant="body2" color="text.secondary">
                当前时段的所有任务都已完成
              </Typography>
            </Box>
          )}
        </Paper>
      )}
      
      {/* Notices Container - Show all notices as a list */}
      {notices.length > 0 && (
        <Paper elevation={1} sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Announcement color="info" />
            <Typography variant="h6">
              运营提醒 Operation Notices
            </Typography>
            <Chip 
              label={`${notices.length} 项`} 
              size="small" 
              color="info" 
              variant="outlined" 
            />
          </Box>
          
          <List disablePadding>
            {notices.map((notice, index) => (
              <React.Fragment key={notice.id}>
                {index > 0 && <Divider sx={{ my: 2 }} />}
                <ListItem 
                  alignItems="flex-start"
                  sx={{ 
                    px: 0,
                    py: 1,
                    '&:hover': { backgroundColor: 'action.hover' },
                    borderRadius: 1
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="subtitle1" fontWeight="medium" color="info.dark">
                        {notice.title}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography 
                          component="span" 
                          variant="body2" 
                          display="block" 
                          sx={{ mb: 2, mt: 1 }}
                        >
                          {notice.description}
                        </Typography>
                        <Button
                          variant="outlined"
                          color="info"
                          size="small"
                          startIcon={<Comment />}
                          onClick={() => {
                            const comment = prompt('请输入您的评论:')
                            if (comment) {
                              onComment(notice.id, comment)
                            }
                          }}
                        >
                          添加评论
                        </Button>
                      </>
                    }
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
      
      {/* Empty State - No tasks or notices */}
      {regularTasks.length === 0 && notices.length === 0 && (
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
          <Assignment sx={{ fontSize: 48, color: 'action.disabled', mb: 2 }} />
          <Typography color="text.secondary">
            当前时段暂无任务或提醒
          </Typography>
        </Paper>
      )}
      
      {/* Swipeable card for pre-closing period */}
      {console.log('Checking swipe card conditions:', {
        isPreclosing: period.id === 'pre-closing',
        showSwipeCard,
        hasCallback: !!onLastCustomerLeft,
        shouldRender: period.id === 'pre-closing' && showSwipeCard && onLastCustomerLeft
      })}
      {period.id === 'pre-closing' && showSwipeCard && onLastCustomerLeft && (
        <Paper 
          elevation={2} 
          ref={el => console.log('Swipe card Paper element:', el)}
          sx={{ 
            pt: 1.5,
            pb: 0,
            px: 2.5, 
            mb: 3, 
            background: theme => `linear-gradient(135deg, ${theme.palette.success.light} 0%, ${theme.palette.success.main} 100%)`,
            color: 'white',
            cursor: 'grab',
            userSelect: 'none',
            position: 'relative',
            overflow: 'hidden',
            transition: 'transform 0.3s ease, opacity 0.3s ease',
            '&:active': {
              cursor: 'grabbing'
            }
          }}
          onMouseDown={(e) => {
            console.log('Mouse down on swipe card')
            const startX = e.clientX
            const element = e.currentTarget as HTMLElement
            
            const handleMouseMove = (e: MouseEvent) => {
              const currentX = e.clientX
              const diffX = currentX - startX
              if (diffX > 0) {
                element.style.transform = `translateX(${diffX}px)`
                element.style.opacity = `${1 - diffX / 300}`
              }
            }
            
            const handleMouseUp = (e: MouseEvent) => {
              const endX = e.clientX
              const diffX = endX - startX
              
              if (diffX > 150) {
                // Swipe completed
                console.log('Swipe threshold reached, starting transition')
                element.style.transform = 'translateX(100%)'
                element.style.opacity = '0'
                setTimeout(() => {
                  console.log('Swipe animation completed - hiding card and calling onLastCustomerLeft')
                  setShowSwipeCard(false)
                  if (onLastCustomerLeft) {
                    console.log('Calling onLastCustomerLeft callback NOW')
                    onLastCustomerLeft()
                  } else {
                    console.log('WARNING: onLastCustomerLeft callback is not defined!')
                  }
                }, 300)
              } else {
                // Reset position
                element.style.transform = 'translateX(0)'
                element.style.opacity = '1'
              }
              
              document.removeEventListener('mousemove', handleMouseMove)
              document.removeEventListener('mouseup', handleMouseUp)
            }
            
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
          }}
          onTouchStart={(e) => {
            console.log('Touch start on swipe card')
            const startX = e.touches[0].clientX
            const element = e.currentTarget
            
            const handleTouchMove = (e: TouchEvent) => {
              const currentX = e.touches[0].clientX
              const diffX = currentX - startX
              if (diffX > 0) {
                element.style.transform = `translateX(${diffX}px)`
                element.style.opacity = `${1 - diffX / 300}`
              }
            }
            
            const handleTouchEnd = (e: TouchEvent) => {
              const endX = e.changedTouches[0].clientX
              const diffX = endX - startX
              
              if (diffX > 150) {
                // Swipe completed
                console.log('Swipe threshold reached, starting transition')
                element.style.transform = 'translateX(100%)'
                element.style.opacity = '0'
                setTimeout(() => {
                  console.log('Swipe animation completed - hiding card and calling onLastCustomerLeft')
                  setShowSwipeCard(false)
                  if (onLastCustomerLeft) {
                    console.log('Calling onLastCustomerLeft callback NOW')
                    onLastCustomerLeft()
                  } else {
                    console.log('WARNING: onLastCustomerLeft callback is not defined!')
                  }
                }, 300)
              } else {
                // Reset position
                element.style.transform = 'translateX(0)'
                element.style.opacity = '1'
              }
              
              element.removeEventListener('touchmove', handleTouchMove)
              element.removeEventListener('touchend', handleTouchEnd)
            }
            
            element.addEventListener('touchmove', handleTouchMove)
            element.addEventListener('touchend', handleTouchEnd)
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ minHeight: 50, pb: 1.5 }}>
            <Box>
              <Typography variant="h6" fontWeight="bold" sx={{ color: 'white', mb: 0.5, lineHeight: 1.2 }}>
                确认最后一桌客人已离店
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', lineHeight: 1.2 }}>
                向右滑动进入闭店流程
              </Typography>
            </Box>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                animation: 'slideHint 2s ease-in-out infinite'
              }}
            >
              <ChevronRight sx={{ fontSize: 32 }} />
              <ChevronRight sx={{ fontSize: 32, opacity: 0.6 }} />
              <ChevronRight sx={{ fontSize: 32, opacity: 0.3 }} />
            </Box>
          </Box>
          <style>
            {`
              @keyframes slideHint {
                0%, 100% { transform: translateX(0); }
                50% { transform: translateX(10px); }
              }
            `}
          </style>
        </Paper>
      )}
      
      {/* Closing complete button */}
      {period.id === 'closing' && (
        <Paper elevation={2} sx={{ p: 3, mt: 3 }}>
          <Button
            variant="contained"
            color="error"
            fullWidth
            size="large"
            onClick={onClosingComplete}
            sx={{ 
              py: 2,
              fontSize: '1.1rem',
              fontWeight: 'bold'
            }}
          >
            一键闭店
          </Button>
        </Paper>
      )}
    </>
  )
}

// Import alpha if not already imported
import { alpha } from '@mui/material/styles'