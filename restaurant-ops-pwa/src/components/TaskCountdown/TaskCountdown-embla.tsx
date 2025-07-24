// Task countdown component with Embla Carousel for smooth swiping
// Updated: Replaced manual swipe handling with Embla Carousel for better performance and UX
import React, { useState, useEffect, useCallback } from 'react'
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
import useEmblaCarousel from 'embla-carousel-react'

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
  // onComment,
  onLastCustomerLeft,
  onClosingComplete,
  onAdvancePeriod
}) => {
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [currentTime, setCurrentTime] = useState<Date>(testTime || new Date())
  const [selectedIndex, setSelectedIndex] = useState(0)
  const prevPeriodRef = React.useRef(period.id)
  
  // Initialize Embla Carousel
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: 'start',
    containScroll: 'trimSnaps',
    skipSnaps: false,
    dragFree: false
  })
  
  // Separate tasks and notices
  const regularTasks = tasks.filter(t => !t.isNotice)
  const notices = tasks.filter(t => t.isNotice)
  
  const allTasksCompleted = regularTasks.length > 0 && regularTasks.every(task => completedTaskIds.includes(task.id))
  
  // Scroll to first uncompleted task on mount or when tasks change
  useEffect(() => {
    if (!emblaApi) return
    
    const firstUncompletedIndex = regularTasks.findIndex(task => !completedTaskIds.includes(task.id))
    if (firstUncompletedIndex !== -1) {
      emblaApi.scrollTo(firstUncompletedIndex, false) // false = no animation on initial load
    }
  }, [emblaApi, regularTasks, period.id]) // Add period.id to reset on period change
  
  // Update selected index when carousel scrolls
  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])
  
  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi, onSelect])
  
  // Reset swipe card when entering pre-closing from another period
  useEffect(() => {
    prevPeriodRef.current = period.id
  }, [period.id])
  
  // Update currentTime for pre-closing/closing periods
  useEffect(() => {
    if (period.id === 'pre-closing' || period.id === 'closing') {
      setCurrentTime(testTime || new Date())
    }
  }, [period.id, testTime])
  
  // Calculate time remaining for countdown periods
  useEffect(() => {
    const calculateTime = () => {
      const now = testTime || new Date()
      
      if (period.id === 'pre-closing' || period.id === 'closing') {
        setCurrentTime(now)
        return
      }
      
      const [endHour, endMinute] = period.endTime.split(':').map(Number)
      const endTime = new Date(now)
      endTime.setHours(endHour, endMinute, 0, 0)
      
      const total = endTime.getTime() - now.getTime()
      
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
  
  // Get urgency level
  const getUrgencyLevel = () => {
    if (period.id === 'pre-closing' || period.id === 'closing') return 'normal'
    
    const totalMinutes = timeRemaining.hours * 60 + timeRemaining.minutes
    const totalSeconds = totalMinutes * 60 + timeRemaining.seconds
    
    if (totalSeconds <= 300 && totalSeconds > 60) return 'warning'
    if (totalSeconds <= 60) return 'critical'
    return 'normal'
  }
  
  const urgencyLevel = getUrgencyLevel()
  
  // Dot click handler
  const scrollTo = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index)
  }, [emblaApi])
  
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
                       'text.secondary' 
              }} 
            />
            <Typography 
              variant="h3" 
              sx={{ 
                fontWeight: 'bold',
                color: urgencyLevel === 'critical' ? 'error.main' : 
                       urgencyLevel === 'warning' ? 'warning.main' : 
                       'text.primary'
              }}
            >
              {period.id === 'pre-closing' || period.id === 'closing' ? (
                currentTime.toLocaleTimeString('zh-CN', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false 
                })
              ) : (
                `${String(timeRemaining.hours).padStart(2, '0')}:${String(timeRemaining.minutes).padStart(2, '0')}:${String(timeRemaining.seconds).padStart(2, '0')}`
              )}
            </Typography>
          </Box>
          
          {urgencyLevel === 'warning' && (
            <Typography variant="body2" color="warning.main" sx={{ fontWeight: 'medium' }}>
              ⚠️ 注意：时间即将结束！
            </Typography>
          )}
          {urgencyLevel === 'critical' && (
            <Typography variant="body2" color="error.main" sx={{ fontWeight: 'bold' }}>
              🚨 警告：时间严重不足！
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Current Task Card with Embla Carousel */}
      {regularTasks.length > 0 && (
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" display="flex" alignItems="center" gap={1}>
              <Assignment sx={{ color: 'primary.main' }} />
              当前任务 Current Task
            </Typography>
            {allTasksCompleted && (
              <Chip 
                icon={<CheckCircle />} 
                label="全部完成 All Completed" 
                color="success" 
                size="small"
              />
            )}
          </Box>
          
          {/* Embla Carousel */}
          <Box className="embla" sx={{ position: 'relative' }}>
            <Box 
              className="embla__viewport" 
              ref={emblaRef}
              sx={{
                overflow: 'hidden',
                width: '100%'
              }}
            >
              <Box 
                className="embla__container"
                sx={{
                  display: 'flex',
                  height: '300px'
                }}
              >
                {regularTasks.map((task, index) => {
                  const isCompleted = completedTaskIds.includes(task.id)
                  const isCurrentSlide = index === selectedIndex
                  
                  return (
                    <Box
                      className="embla__slide"
                      key={task.id}
                      sx={{
                        flex: '0 0 100%',
                        minWidth: 0,
                        padding: '0 8px'
                      }}
                    >
                      <Box sx={{ 
                        border: theme => isCurrentSlide ? `2px solid ${theme.palette.primary.main}` : '1px solid',
                        borderColor: isCompleted ? 'success.main' : 'divider',
                        borderRadius: 2,
                        p: 3,
                        backgroundColor: isCompleted ? 'action.hover' : 'background.paper',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        opacity: isCompleted ? 0.7 : 1,
                        transform: isCurrentSlide ? 'scale(1)' : 'scale(0.95)',
                        transition: 'all 0.3s ease'
                      }}>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                          <Typography variant="h5" fontWeight="bold" sx={{ flex: 1 }}>
                            {task.title}
                          </Typography>
                          {isCompleted && (
                            <CheckCircleOutline sx={{ color: 'success.main', fontSize: 30, ml: 1 }} />
                          )}
                        </Box>
                        
                        {task.description && (
                          <Typography variant="body1" color="text.secondary" paragraph sx={{ flex: 1 }}>
                            {task.description}
                          </Typography>
                        )}
                        
                        {/* Required Evidence */}
                        {task.uploadRequirement && (
                          <Box mb={2}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                              需要提交 Required:
                            </Typography>
                            <Box display="flex" gap={1} flexWrap="wrap">
                              {[task.uploadRequirement].map((evidence, idx) => (
                                <Chip
                                  key={idx}
                                  size="small"
                                  icon={
                                    evidence === 'photo' ? <PhotoCamera /> :
                                    evidence === 'video' ? <Videocam /> :
                                    evidence === 'text' ? <TextFields /> :
                                    <Comment />
                                  }
                                  label={
                                    evidence === 'photo' ? '照片' :
                                    evidence === 'video' ? '视频' :
                                    evidence === 'text' ? '文字' :
                                    '备注'
                                  }
                                />
                              ))}
                            </Box>
                          </Box>
                        )}
                        
                        {!isCompleted && (
                          <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            size="large"
                            onClick={() => onComplete(task.id, {})}
                            sx={{ mt: 'auto' }}
                          >
                            完成任务 Complete Task
                          </Button>
                        )}
                      </Box>
                    </Box>
                  )
                })}
              </Box>
            </Box>
            
            {/* Dot indicators */}
            <Box 
              display="flex" 
              justifyContent="center" 
              gap={1} 
              mt={2}
            >
              {regularTasks.map((_, index) => (
                <Box
                  key={index}
                  onClick={() => scrollTo(index)}
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: index === selectedIndex ? 'primary.main' : 'action.disabled',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.2)'
                    }
                  }}
                />
              ))}
            </Box>
          </Box>
        </Paper>
      )}

      {/* Swipe Card for Pre-closing Period (Manager Only) */}
      {period.id === 'pre-closing' && onLastCustomerLeft && (
        <Paper 
          elevation={3} 
          sx={{ 
            p: 3, 
            mb: 3,
            background: theme => `linear-gradient(135deg, ${theme.palette.warning.light} 0%, ${theme.palette.warning.main} 100%)`,
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                最后一位客人离店
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                请向右滑动确认最后一位客人已离店
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="error"
              size="large"
              onClick={onLastCustomerLeft}
              sx={{ 
                backgroundColor: 'rgba(255,255,255,0.9)',
                color: 'error.main',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,1)'
                }
              }}
            >
              客人已离店
            </Button>
          </Box>
        </Paper>
      )}

      {/* Closing Complete Button */}
      {period.id === 'closing' && onClosingComplete && allTasksCompleted && (
        <Paper elevation={3} sx={{ p: 3, mb: 3, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            所有闭店任务已完成
          </Typography>
          <Button
            variant="contained"
            color="error"
            size="large"
            fullWidth
            onClick={onClosingComplete}
            sx={{ mt: 2 }}
          >
            确认闭店
          </Button>
        </Paper>
      )}

      {/* Advance Period Button */}
      {onAdvancePeriod && !allTasksCompleted && (
        <Box textAlign="center" mb={3}>
          <Button
            variant="outlined"
            color="warning"
            size="small"
            onClick={onAdvancePeriod}
          >
            提前进入下一阶段
          </Button>
        </Box>
      )}

      {/* Notices Section */}
      {notices.length > 0 && (
        <Paper elevation={1} sx={{ p: 2 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Announcement sx={{ color: 'info.main' }} />
            <Typography variant="h6">
              注意事项 Notices
            </Typography>
          </Box>
          <List disablePadding>
            {notices.map((notice, index) => (
              <React.Fragment key={notice.id}>
                {index > 0 && <Divider />}
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary={notice.title}
                    secondary={notice.description}
                    primaryTypographyProps={{ fontWeight: 'medium' }}
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
    </>
  )
}