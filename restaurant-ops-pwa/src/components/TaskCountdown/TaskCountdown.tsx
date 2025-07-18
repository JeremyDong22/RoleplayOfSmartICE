// Task countdown component with Embla Carousel for smooth swiping
// Updated: Fixed free dragging in Embla Carousel by removing containScroll constraints,
// adjusting flex properties, and using minHeight instead of fixed height to allow users 
// to swipe freely between all task cards at any time
// Updated: Redesigned SwipeableLastCustomerCard with iPhone-style "slide to unlock" interface,
// featuring green success colors, shimmer effects, clean design, and premium animations.
// Removed confusing animated dots and replaced with elegant sliding button interaction
// Updated: Added confirmation dialog for "提前进入下一阶段" button and hid it during
// pre-closing period to prevent accidental advancement
// Updated: Implemented snap-to-center animation with magnetic effect. Cards now automatically
// center themselves when swiping ends, with smooth elastic animations and scale transitions
// for a premium feel. Adjusted Embla settings: align center, trimSnaps, and custom easing.
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

// Swipeable card component for last customer confirmation - iPhone-style slide to unlock
const SwipeableLastCustomerCard: React.FC<{ onConfirm: () => void }> = ({ onConfirm }) => {
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const sliderRef = React.useRef<HTMLDivElement>(null)
  const trackRef = React.useRef<HTMLDivElement>(null)
  const startXRef = React.useRef(0)
  
  const SLIDER_WIDTH = 60 // Width of the sliding button
  const TRACK_PADDING = 4 // Padding inside the track
  const [maxDrag, setMaxDrag] = useState(300) // Will be calculated based on track width
  
  // Calculate the actual maximum drag distance based on track width
  useEffect(() => {
    if (trackRef.current) {
      const trackWidth = trackRef.current.offsetWidth
      setMaxDrag(trackWidth - SLIDER_WIDTH - (TRACK_PADDING * 2))
    }
  }, [])
  
  const handleStart = (clientX: number) => {
    if (isConfirmed) return
    setIsDragging(true)
    startXRef.current = clientX - dragX
  }
  
  const handleMove = (clientX: number) => {
    if (!isDragging || isConfirmed) return
    const newX = clientX - startXRef.current
    // Only allow dragging to the right, up to the maximum
    if (newX >= 0) {
      setDragX(Math.min(newX, maxDrag))
    }
  }
  
  const handleEnd = () => {
    if (!isDragging || isConfirmed) return
    setIsDragging(false)
    
    // Check if we've reached the end
    if (dragX >= maxDrag - 10) { // 10px tolerance
      // Trigger confirmation
      setIsConfirmed(true)
      setDragX(maxDrag)
      // Add a small delay before calling onConfirm for visual feedback
      setTimeout(() => {
        onConfirm()
      }, 500)
    } else {
      // Snap back with spring animation
      setDragX(0)
    }
  }
  
  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => handleStart(e.clientX)
  const handleMouseMove = (e: React.MouseEvent) => handleMove(e.clientX)
  const handleMouseUp = () => handleEnd()
  
  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX)
  const handleTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX)
  const handleTouchEnd = () => handleEnd()
  
  // Add global mouse/touch end listeners
  useEffect(() => {
    const handleGlobalEnd = () => {
      if (isDragging) {
        handleEnd()
      }
    }
    
    if (isDragging) {
      document.addEventListener('mouseup', handleGlobalEnd)
      document.addEventListener('touchend', handleGlobalEnd)
      
      return () => {
        document.removeEventListener('mouseup', handleGlobalEnd)
        document.removeEventListener('touchend', handleGlobalEnd)
      }
    }
  }, [isDragging, dragX])
  
  const progress = dragX / maxDrag
  
  return (
    <Paper 
      elevation={3} 
      sx={{ 
        mb: 3,
        position: 'relative',
        overflow: 'hidden',
        background: theme => `linear-gradient(135deg, ${theme.palette.success.light}15, ${theme.palette.success.main}15)`,
        border: theme => `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
      }}
    >
      <Box sx={{ p: 3 }}>
        {/* Title */}
        <Typography 
          variant="h6" 
          gutterBottom 
          sx={{ 
            fontWeight: 'bold',
            color: 'text.primary',
            mb: 1
          }}
        >
          最后一位客人离店
        </Typography>
        
        {/* Subtitle */}
        <Typography 
          variant="body2" 
          sx={{ 
            color: 'text.secondary',
            mb: 3
          }}
        >
          确认所有客人已离开餐厅
        </Typography>
        
        {/* Slide Track */}
        <Box
          ref={trackRef}
          sx={{
            position: 'relative',
            height: 68,
            borderRadius: 34,
            background: theme => alpha(theme.palette.success.main, 0.1),
            border: theme => `2px solid ${alpha(theme.palette.success.main, 0.2)}`,
            overflow: 'hidden',
            cursor: 'default',
          }}
        >
          {/* Shimmer/Glow effect */}
          {!isConfirmed && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '100%',
                background: theme => `linear-gradient(90deg, 
                  transparent 0%, 
                  ${alpha(theme.palette.success.light, 0.3)} 50%, 
                  transparent 100%)`,
                animation: 'shimmer 2.5s ease-in-out infinite',
                '@keyframes shimmer': {
                  '0%': { left: '-100%' },
                  '100%': { left: '100%' }
                }
              }}
            />
          )}
          
          {/* Progress fill */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${progress * 100}%`,
              height: '100%',
              background: theme => alpha(theme.palette.success.main, 0.15),
              transition: isDragging ? 'none' : 'width 0.3s ease',
            }}
          />
          
          {/* Center text */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              opacity: isConfirmed ? 0 : 1 - progress,
              transition: 'opacity 0.3s ease',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            <Typography
              variant="body1"
              sx={{
                color: theme => theme.palette.success.main,
                fontWeight: 500,
                letterSpacing: '0.02em',
              }}
            >
              滑动确认
            </Typography>
            <Box
              component="span"
              sx={{
                color: theme => theme.palette.success.main,
                fontSize: 20,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              »
            </Box>
          </Box>
          
          {/* Success message */}
          {isConfirmed && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                opacity: 1,
                animation: 'fadeInScale 0.5s ease-out',
                '@keyframes fadeInScale': {
                  '0%': { 
                    opacity: 0,
                    transform: 'translate(-50%, -50%) scale(0.8)'
                  },
                  '100%': { 
                    opacity: 1,
                    transform: 'translate(-50%, -50%) scale(1)'
                  }
                },
                pointerEvents: 'none',
              }}
            >
              <CheckCircle sx={{ color: 'success.main', fontSize: 24 }} />
              <Typography
                variant="body1"
                sx={{
                  color: 'success.main',
                  fontWeight: 600,
                }}
              >
                已确认
              </Typography>
            </Box>
          )}
          
          {/* Sliding button */}
          <Box
            ref={sliderRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            sx={{
              position: 'absolute',
              top: TRACK_PADDING,
              left: TRACK_PADDING,
              width: SLIDER_WIDTH,
              height: 60,
              borderRadius: 30,
              background: theme => isConfirmed 
                ? theme.palette.success.main 
                : `linear-gradient(135deg, ${theme.palette.success.light}, ${theme.palette.success.main})`,
              boxShadow: theme => isConfirmed
                ? `0 2px 8px ${alpha(theme.palette.success.main, 0.4)}`
                : `0 2px 12px ${alpha(theme.palette.success.main, 0.3)}, 0 4px 20px ${alpha(theme.palette.success.main, 0.2)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isConfirmed ? 'default' : 'grab',
              transform: `translateX(${dragX}px)`,
              transition: isDragging 
                ? 'box-shadow 0.2s ease' 
                : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              touchAction: 'none',
              '&:active': {
                cursor: isConfirmed ? 'default' : 'grabbing'
              }
            }}
          >
            <Box
              sx={{
                color: 'white',
                fontSize: 24,
                display: 'flex',
                alignItems: 'center',
                transform: isConfirmed ? 'none' : `translateX(${Math.min(dragX * 0.1, 5)}px)`,
                transition: 'transform 0.2s ease',
              }}
            >
              {isConfirmed ? '✓' : '›'}
            </Box>
          </Box>
        </Box>
      </Box>
    </Paper>
  )
}

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
  const [selectedIndex, setSelectedIndex] = useState(0)
  const prevPeriodRef = React.useRef(period.id)
  
  // Initialize Embla Carousel with snap-to-center animation
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: 'center',  // Center slides in viewport
    containScroll: 'trimSnaps',  // Trim snaps for proper centering
    skipSnaps: false,
    dragFree: false,  // Disable free dragging to enable snapping
    dragThreshold: 10,  // Higher threshold for intentional drags
    watchDrag: true,  // Ensure drag is always watched
    inViewThreshold: 0.8,  // Slide must be 80% visible to be considered in view
    slidesToScroll: 1,
    startIndex: 0,
    watchSlides: true,
    watchResize: true,
    speed: 20,  // Increased speed for snappier animations
    duration: 500  // Smooth elastic animation duration (in ms)
  })
  
  // Separate tasks and notices
  const regularTasks = tasks.filter(t => !t.isNotice)
  const notices = tasks.filter(t => t.isNotice)
  
  const allTasksCompleted = regularTasks.length > 0 && regularTasks.every(task => completedTaskIds.includes(task.id))
  
  // Scroll to first uncompleted task on mount or when tasks change
  useEffect(() => {
    if (!emblaApi) return
    
    // Allow carousel to settle before scrolling
    const timer = setTimeout(() => {
      const firstUncompletedIndex = regularTasks.findIndex(task => !completedTaskIds.includes(task.id))
      if (firstUncompletedIndex !== -1 && emblaApi.canScrollTo(firstUncompletedIndex)) {
        emblaApi.scrollTo(firstUncompletedIndex, false) // false = no animation on initial load
      }
    }, 100)
    
    return () => clearTimeout(timer)
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
          
          {/* Advance Period Button */}
          {onAdvancePeriod && !allTasksCompleted && period.id !== 'pre-closing' && (
            <Box mt={2}>
              <Button
                variant="outlined"
                color="warning"
                size="small"
                onClick={() => {
                  if (window.confirm('确定要提前进入下一阶段吗？\n\nAre you sure you want to advance to the next period?')) {
                    onAdvancePeriod()
                  }
                }}
              >
                提前进入下一阶段
              </Button>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Current Task Card with Embla Carousel */}
      {regularTasks.length > 0 && (
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                <Assignment sx={{ color: 'primary.main' }} />
                当前任务 Current Task
              </Typography>
              {regularTasks.length > 1 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  左右滑动查看更多任务 →
                </Typography>
              )}
            </Box>
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
                width: '100%',
                cursor: 'grab',
                '&:active': {
                  cursor: 'grabbing'
                },
                // Ensure smooth scrolling on iOS
                WebkitOverflowScrolling: 'touch',
                // Prevent text selection during swipe
                userSelect: 'none',
                WebkitUserSelect: 'none'
              }}
            >
              <Box 
                className="embla__container"
                sx={{
                  display: 'flex',
                  minHeight: '300px',  // Changed from fixed height to minHeight
                  touchAction: 'pan-y',  // Allow horizontal scrolling by not restricting pan-x
                  willChange: 'transform',  // Optimize for transform changes
                  transition: 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)'  // Smooth elastic transition
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
                        flex: '0 0 85%',  // Show 85% of viewport for centered view
                        minWidth: 0,
                        paddingLeft: '8px',  // Balanced padding for center alignment
                        paddingRight: '8px',
                        boxSizing: 'border-box'
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
                        transform: isCurrentSlide ? 'scale(1)' : 'scale(0.92)',
                        transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease, border 0.3s ease',
                        pointerEvents: 'auto',  // Ensure pointer events work
                        touchAction: 'manipulation'  // Better touch handling
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
                        {task.requiredEvidence && task.requiredEvidence.length > 0 && (
                          <Box mb={2}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                              需要提交 Required:
                            </Typography>
                            <Box display="flex" gap={1} flexWrap="wrap">
                              {task.requiredEvidence.map((evidence, idx) => (
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
              {regularTasks.map((task, index) => {
                const isCompleted = completedTaskIds.includes(task.id)
                const isSelected = index === selectedIndex
                
                return (
                  <Box
                    key={index}
                    onClick={() => scrollTo(index)}
                    sx={{
                      width: isSelected ? 12 : 10,
                      height: isSelected ? 12 : 10,
                      borderRadius: '50%',
                      backgroundColor: isCompleted ? 'success.main' : 
                                       isSelected ? 'primary.main' : 
                                       'action.disabled',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      border: isCompleted ? '2px solid transparent' : 'none',
                      '&:hover': {
                        transform: 'scale(1.3)',
                        opacity: 0.8
                      }
                    }}
                  />
                )
              })}
            </Box>
          </Box>
        </Paper>
      )}

      {/* Swipe Card for Pre-closing Period (Manager Only) */}
      {period.id === 'pre-closing' && onLastCustomerLeft && (
        <SwipeableLastCustomerCard onConfirm={onLastCustomerLeft} />
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