// Task countdown component with separate displays for tasks and notices
// Updated: Fixed swipe boundaries - prevents swiping beyond first/last task and adds elastic resistance
import React, { useState, useEffect } from 'react'
import {
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  alpha
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
  Announcement
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
  onAdvancePeriod?: () => void
}

export const TaskCountdown: React.FC<TaskCountdownProps> = ({
  period,
  tasks,
  completedTaskIds,
  testTime,
  onComplete,
  onComment,
  onLastCustomerLeft,
  onClosingComplete,
  onAdvancePeriod
}) => {
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [currentTime, setCurrentTime] = useState<Date>(testTime || new Date())
  const [activeTaskIndex, setActiveTaskIndex] = useState(0) // Track which task is currently visible
  const [swipeStartX, setSwipeStartX] = useState(0)
  const [swipeCurrentX, setSwipeCurrentX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const prevPeriodRef = React.useRef(period.id)
  
  
  // Separate tasks and notices
  const regularTasks = tasks.filter(t => !t.isNotice)
  const notices = tasks.filter(t => t.isNotice)
  
  // Find the current task (first uncompleted task)
  // const currentTask = regularTasks.find(task => !completedTaskIds.includes(task.id))
  const allTasksCompleted = regularTasks.length > 0 && regularTasks.every(task => completedTaskIds.includes(task.id))
  
  // Initialize active task index only on mount
  React.useEffect(() => {
    const firstUncompletedIndex = regularTasks.findIndex(task => !completedTaskIds.includes(task.id))
    if (firstUncompletedIndex !== -1 && activeTaskIndex === 0) {
      setActiveTaskIndex(firstUncompletedIndex)
    }
  }, [regularTasks]) // Remove completedTaskIds from dependencies to prevent auto-jump
  
  // Reset swipe card when entering pre-closing from another period
  useEffect(() => {
    // Update ref for next render
    prevPeriodRef.current = period.id
  }, [period.id])
  
  // Update currentTime for pre-closing/closing periods
  useEffect(() => {
    if (period.id === 'pre-closing' || period.id === 'closing') {
      // Update immediately when testTime changes
      setCurrentTime(testTime || new Date())
      // console.log(`${period.id} time updated:`, (testTime || new Date()).toLocaleTimeString())
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
      // console.log(`${period.id} countdown update:`, {
      //   testTime: testTime?.toLocaleTimeString() || 'none',
      //   now: now.toLocaleTimeString(),
      //   endTime: endTime.toLocaleTimeString(),
      //   periodEndTime: period.endTime,
      //   total: total,
      //   totalMinutes: Math.floor(total / (1000 * 60)),
      //   totalSeconds: Math.floor(total / 1000)
      // })
      
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
  // const calculateProgress = () => {
  //   const now = testTime || new Date()
  //   const [startHour, startMinute] = period.startTime.split(':').map(Number)
  //   const [endHour, endMinute] = period.endTime.split(':').map(Number)
  //   
  //   const start = new Date(now)
  //   start.setHours(startHour, startMinute, 0, 0)
  //   
  //   const end = new Date(now)
  //   end.setHours(endHour, endMinute, 0, 0)
  //   
  //   const total = end.getTime() - start.getTime()
  //   const elapsed = now.getTime() - start.getTime()
  //   
  //   return Math.min(100, Math.max(0, (elapsed / total) * 100))
  // }
  
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
          
          {/* Advance Period Button - only show for non pre-closing/closing periods and when callback exists */}
          {period.id !== 'pre-closing' && period.id !== 'closing' && onAdvancePeriod && (
            <Button
              variant="outlined"
              color="primary"
              size="small"
              onClick={() => {
                if (confirm('确定要提前进入下一阶段吗？')) {
                  onAdvancePeriod()
                }
              }}
              sx={{ mt: 2 }}
            >
              提前进入下一阶段
            </Button>
          )}
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
            // Show tasks using transform-based sliding
            <Box>
              <Box 
                ref={containerRef}
                sx={{ 
                  position: 'relative',
                  overflow: 'hidden',
                  width: '100%',
                  height: '300px' // Fixed height for the card container
                }}
                onTouchStart={(e) => {
                  setSwipeStartX(e.touches[0].clientX)
                  setSwipeCurrentX(e.touches[0].clientX)
                  setIsSwiping(true)
                }}
                onTouchMove={(e) => {
                  if (!isSwiping) return
                  setSwipeCurrentX(e.touches[0].clientX)
                }}
                onTouchEnd={() => {
                  if (!isSwiping) return
                  const diffX = swipeStartX - swipeCurrentX
                  const threshold = containerRef.current?.clientWidth ? containerRef.current.clientWidth / 3 : 100
                  
                  // Check boundaries and snap to nearest task
                  if (Math.abs(diffX) > threshold) {
                    if (diffX > 0 && activeTaskIndex < regularTasks.length - 1) {
                      // Swipe left - go to next task
                      setActiveTaskIndex(activeTaskIndex + 1)
                    } else if (diffX < 0 && activeTaskIndex > 0) {
                      // Swipe right - go to previous task
                      setActiveTaskIndex(activeTaskIndex - 1)
                    }
                  }
                  
                  setIsSwiping(false)
                  setSwipeStartX(0)
                  setSwipeCurrentX(0)
                }}
                onMouseDown={(e) => {
                  setSwipeStartX(e.clientX)
                  setSwipeCurrentX(e.clientX)
                  setIsSwiping(true)
                  e.preventDefault()
                }}
                onMouseMove={(e) => {
                  if (!isSwiping) return
                  setSwipeCurrentX(e.clientX)
                }}
                onMouseUp={() => {
                  if (!isSwiping) return
                  const diffX = swipeStartX - swipeCurrentX
                  const threshold = containerRef.current?.clientWidth ? containerRef.current.clientWidth / 3 : 100
                  
                  // Check boundaries and snap to nearest task
                  if (Math.abs(diffX) > threshold) {
                    if (diffX > 0 && activeTaskIndex < regularTasks.length - 1) {
                      // Swipe left - go to next task
                      setActiveTaskIndex(activeTaskIndex + 1)
                    } else if (diffX < 0 && activeTaskIndex > 0) {
                      // Swipe right - go to previous task
                      setActiveTaskIndex(activeTaskIndex - 1)
                    }
                  }
                  
                  setIsSwiping(false)
                  setSwipeStartX(0)
                  setSwipeCurrentX(0)
                }}
                onMouseLeave={() => {
                  if (isSwiping) {
                    setIsSwiping(false)
                    setSwipeStartX(0)
                    setSwipeCurrentX(0)
                  }
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    transition: isSwiping ? 'none' : 'transform 0.3s ease',
                    transform: (() => {
                      const baseTransform = -activeTaskIndex * 100
                      let swipeOffset = 0
                      
                      if (isSwiping) {
                        const containerWidth = containerRef.current?.clientWidth || 0
                        const rawOffset = swipeCurrentX - swipeStartX
                        
                        // Apply elastic resistance at boundaries
                        if (activeTaskIndex === 0 && rawOffset > 0) {
                          // At first task, trying to swipe right
                          swipeOffset = rawOffset * 0.3 // Elastic resistance
                        } else if (activeTaskIndex === regularTasks.length - 1 && rawOffset < 0) {
                          // At last task, trying to swipe left
                          swipeOffset = rawOffset * 0.3 // Elastic resistance
                        } else {
                          // Normal swipe
                          swipeOffset = rawOffset
                        }
                        
                        // Convert pixel offset to percentage
                        swipeOffset = (swipeOffset / containerWidth) * 100
                      }
                      
                      return `translateX(${baseTransform + swipeOffset}%)`
                    })(),
                    width: `${regularTasks.length * 100}%`
                  }}
                >
                  {regularTasks.map((task, index) => {
                    const isCompleted = completedTaskIds.includes(task.id)
                    const isCurrentTask = index === activeTaskIndex
                    
                    return (
                      <Box
                        key={task.id}
                        sx={{
                          width: `${100 / regularTasks.length}%`,
                          padding: '0 8px',
                          opacity: isCompleted ? 0.6 : 1,
                          transform: isCurrentTask ? 'scale(1)' : 'scale(0.95)',
                          transition: 'all 0.3s ease'
                        }}
                      >
                      <Box sx={{ 
                        border: theme => isCurrentTask ? `2px solid ${theme.palette.primary.main}` : '1px solid',
                        borderColor: isCompleted ? 'success.main' : 'divider',
                        borderRadius: 2,
                        p: 3,
                        backgroundColor: isCompleted ? 'action.hover' : 'background.paper',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                          <Typography variant="h5" fontWeight="bold" sx={{ flex: 1 }}>
                            {task.title}
                          </Typography>
                          {isCompleted && (
                            <CheckCircle sx={{ color: 'success.main', ml: 1 }} />
                          )}
                        </Box>
                        
                        <Box sx={{ 
                          flex: 1, 
                          overflowY: 'auto',
                          mb: 2,
                          '&::-webkit-scrollbar': { width: 6 },
                          '&::-webkit-scrollbar-track': { backgroundColor: 'action.hover' },
                          '&::-webkit-scrollbar-thumb': { 
                            backgroundColor: 'action.selected', 
                            borderRadius: 3 
                          }
                        }}>
                          <Typography variant="body1" color="text.secondary">
                            {task.description}
                          </Typography>
                        </Box>
                        
                        {/* Requirements */}
                        <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                          {task.requiresPhoto && (
                            <Chip
                              icon={<PhotoCamera />}
                              label="需要照片"
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          )}
                          {task.requiresVideo && (
                            <Chip
                              icon={<Videocam />}
                              label="需要视频"
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          )}
                          {task.requiresText && (
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
                          color={isCompleted ? "success" : "primary"}
                          fullWidth
                          size="large"
                          disabled={isCompleted}
                          startIcon={isCompleted ? <CheckCircle /> : <CheckCircleOutline />}
                          onClick={() => !isCompleted && onComplete(task.id, {})}
                          sx={{ mt: 'auto' }} // 确保按钮始终在底部
                        >
                          {isCompleted ? '已完成 Completed' : '完成任务 Complete Task'}
                        </Button>
                      </Box>
                    </Box>
                    )
                  })}
                </Box>
              </Box>
              
              {/* Task indicators - simple dots without scroll offset */}
              <Box display="flex" justifyContent="center" gap={1} mt={2}>
                {regularTasks.map((task, index) => {
                  const isCompleted = completedTaskIds.includes(task.id)
                  const isActive = index === activeTaskIndex
                  
                  return (
                    <Box
                      key={task.id}
                      sx={{
                        width: isActive ? 12 : 8,
                        height: isActive ? 12 : 8,
                        borderRadius: '50%',
                        backgroundColor: isCompleted ? 'success.main' : 
                                       isActive ? 'primary.main' : 'action.disabled',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        // Allow clicking on dots to navigate
                        setActiveTaskIndex(index)
                      }}
                    />
                  )
                })}
              </Box>
            </Box>
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
      
      {/* Pre-closing period button for last customer left */}
      {period.id === 'pre-closing' && onLastCustomerLeft && (
        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
          <Button
            variant="contained"
            color="success"
            fullWidth
            size="large"
            onClick={onLastCustomerLeft}
            sx={{ 
              py: 2,
              fontSize: '1.1rem',
              fontWeight: 'bold'
            }}
          >
            确认最后一桌客人已离店
          </Button>
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