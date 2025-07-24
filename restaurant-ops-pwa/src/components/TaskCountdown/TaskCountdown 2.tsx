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
// Updated: Removed automatic scrolling to first uncompleted task to enable free swiping
// like a photo album. Users can now freely browse all tasks without being forced back.
// Updated: Added automatic reset to first task card when period changes. Now when transitioning
// between periods, the carousel automatically scrolls back to the first task for better UX.
// Updated: Added special styling for audit tasks. Auto-generated audit tasks show with dashed
// border initially, then turn orange with "待审核" label when duty manager submits their tasks.
// Integrated with DutyManagerContext to track submission status.
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
  Announcement,
  Checklist
} from '@mui/icons-material'
import type { TaskTemplate, WorkflowPeriod } from '../../utils/workflowParser'

interface NoticeComment {
  noticeId: string
  comment: string
  timestamp: Date
}
import useEmblaCarousel from 'embla-carousel-react'
import PhotoSubmissionDialog from '../PhotoSubmissionDialog'
import AudioRecordingDialog from '../AudioRecordingDialog'
import TextInputDialog from '../TextInputDialog'
import NoticeCommentDialog from '../NoticeCommentDialog'
import ListSubmissionDialog from '../ListSubmissionDialog'
import { ReviewTaskDialog } from '../ReviewTaskDialog/ReviewTaskDialog'
import { useDutyManager } from '../../contexts/DutyManagerContext'
import RateReviewIcon from '@mui/icons-material/RateReview'
import PendingActionsIcon from '@mui/icons-material/PendingActions'

// Swipeable card component for last customer confirmation - iPhone-style slide to unlock
const SwipeableLastCustomerCard: React.FC<{ onConfirm: () => void }> = ({ onConfirm }) => {
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const startXRef = React.useRef(0)
  
  const [containerWidth, setContainerWidth] = useState(300)
  const SWIPE_THRESHOLD = 0.4 // Swipe 40% to confirm
  
  // Calculate container width
  useEffect(() => {
    if (containerRef.current) {
      const width = containerRef.current.offsetWidth
      setContainerWidth(width)
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
    // Only allow dragging to the right
    if (newX >= 0) {
      setDragX(Math.min(newX, containerWidth))
    }
  }
  
  const handleEnd = () => {
    if (!isDragging || isConfirmed) return
    setIsDragging(false)
    
    // Check if we've swiped enough
    if (dragX >= containerWidth * SWIPE_THRESHOLD) {
      // Trigger confirmation
      setIsConfirmed(true)
      setDragX(containerWidth)
      // Add a small delay before calling onConfirm for visual feedback
      setTimeout(() => {
        onConfirm()
      }, 400)
    } else {
      // Snap back
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
  
  const progress = dragX / containerWidth
  
  return (
    <Box
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      sx={{
        mb: 3,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 2,
        cursor: isConfirmed ? 'default' : 'grab',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'pan-y',
        '&:active': {
          cursor: isConfirmed ? 'default' : 'grabbing'
        }
      }}
    >
      {/* Background layer */}
      <Paper 
        elevation={2}
        sx={{
          position: 'relative',
          height: 80,
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          background: theme => isConfirmed 
            ? theme.palette.success.main
            : `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.08)}, ${alpha(theme.palette.success.main, 0.15)})`,
          border: theme => `1px solid ${alpha(theme.palette.success.main, isConfirmed ? 0.5 : 0.2)}`,
          transition: 'all 0.3s ease',
        }}
      >
        {/* Progress fill */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: theme => alpha(theme.palette.success.main, 0.1),
            transform: `translateX(${-100 + progress * 100}%)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease',
          }}
        />
        
        {/* Content container */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            px: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `translateX(${dragX}px)`,
            transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* Text content */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              opacity: isConfirmed ? 0 : 1,
              transition: 'opacity 0.3s ease',
            }}
          >
            <Typography
              variant="h6"
              sx={{
                color: theme => isConfirmed ? 'white' : theme.palette.success.main,
                fontWeight: 600,
                fontSize: '1.1rem',
              }}
            >
              最后一位客人离店
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                color: theme => alpha(theme.palette.success.main, 0.7),
              }}
            >
              <Typography variant="body2">
                滑动确认
              </Typography>
              <Box
                component="span"
                sx={{
                  fontSize: 18,
                  animation: 'slideArrow 1.5s ease-in-out infinite',
                  '@keyframes slideArrow': {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '50%': { transform: 'translateX(4px)' }
                  }
                }}
              >
                →
              </Box>
            </Box>
          </Box>
          
          {/* Success state */}
          {isConfirmed && (
            <Box
              sx={{
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color: 'white',
                animation: 'fadeIn 0.3s ease-out',
                '@keyframes fadeIn': {
                  '0%': { opacity: 0 },
                  '100%': { opacity: 1 }
                }
              }}
            >
              <CheckCircle sx={{ fontSize: 24 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                已确认
              </Typography>
            </Box>
          )}
        </Box>
        
        {/* Visual hint arrow on the right */}
        {!isConfirmed && !isDragging && (
          <Box
            sx={{
              position: 'absolute',
              right: 20,
              top: '50%',
              transform: 'translateY(-50%)',
              color: theme => alpha(theme.palette.success.main, 0.3),
              fontSize: 24,
              animation: 'pulse 2s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 0.3 },
                '50%': { opacity: 0.6 }
              }
            }}
          >
            →
          </Box>
        )}
      </Paper>
    </Box>
  )
}

interface TaskCountdownProps {
  period: WorkflowPeriod
  tasks: TaskTemplate[]
  completedTaskIds: string[]
  noticeComments: NoticeComment[]
  testTime?: Date
  onComplete: (taskId: string, data: any) => void
  onComment: (noticeId: string, comment: string) => void
  onLastCustomerLeft?: () => void
  onLastCustomerLeftLunch?: () => void
  onClosingComplete?: () => void
  onAdvancePeriod?: () => void
  onReviewReject?: (taskId: string, reason: string) => void
}

export const TaskCountdown: React.FC<TaskCountdownProps> = ({
  period,
  tasks,
  completedTaskIds,
  noticeComments,
  testTime,
  onComplete,
  onComment,
  onLastCustomerLeft,
  onLastCustomerLeftLunch,
  onClosingComplete,
  onAdvancePeriod,
  onReviewReject
}) => {
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [currentTime, setCurrentTime] = useState<Date>(testTime || new Date())
  const [selectedIndex, setSelectedIndex] = useState(0)
  const prevPeriodRef = React.useRef(period?.id)
  const { submissions } = useDutyManager()
  
  // Dialog states
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false)
  const [audioDialogOpen, setAudioDialogOpen] = useState(false)
  const [textDialogOpen, setTextDialogOpen] = useState(false)
  const [listDialogOpen, setListDialogOpen] = useState(false)
  const [noticeCommentDialogOpen, setNoticeCommentDialogOpen] = useState(false)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [activeTask, setActiveTask] = useState<TaskTemplate | null>(null)
  const [activeNotice, setActiveNotice] = useState<TaskTemplate | null>(null)
  
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
    duration: 500  // Smooth elastic animation duration (in ms)
  })
  
  // Separate tasks and notices
  console.log('TaskCountdown received tasks:', tasks, 'isArray:', Array.isArray(tasks))
  const regularTasks = Array.isArray(tasks) ? tasks.filter(t => t && !t.isNotice) : []
  const notices = Array.isArray(tasks) ? tasks.filter(t => t && t.isNotice) : []
  
  const allTasksCompleted = regularTasks.length > 0 && regularTasks.every(task => (completedTaskIds || []).includes(task.id))
  
  // Free swiping mode - removed automatic scrolling to first uncompleted task
  // Users can now freely swipe between all tasks like browsing a photo album
  useEffect(() => {
    if (!emblaApi) return
    // Simply ensure the carousel is ready without forcing any specific position
  }, [emblaApi])
  
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
  
  // Reset carousel to first slide when period changes
  useEffect(() => {
    if (period?.id !== prevPeriodRef.current && emblaApi) {
      setSelectedIndex(0)
      emblaApi.scrollTo(0)
    }
    prevPeriodRef.current = period?.id
  }, [period?.id, emblaApi])
  
  // Update currentTime for pre-closing/closing periods
  useEffect(() => {
    if (period?.id === 'pre-closing' || period?.id === 'closing') {
      setCurrentTime(testTime || new Date())
    }
  }, [period?.id, testTime])
  
  // Calculate time remaining for countdown periods
  useEffect(() => {
    const calculateTime = () => {
      const now = testTime || new Date()
      
      if (!period || period.id === 'pre-closing' || period.id === 'closing') {
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
  }, [period?.id, period?.endTime, testTime])
  
  // Get urgency level
  const getUrgencyLevel = () => {
    if (!period || period.id === 'pre-closing' || period.id === 'closing') return 'normal'
    
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
  
  // Early return if period or tasks is undefined
  if (!period || !tasks) {
    console.warn('TaskCountdown: Missing required props', { period: !!period, tasks: !!tasks })
    return null
  }
  
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
              {period?.id === 'pre-closing' || period?.id === 'closing' ? (
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
          
          {/* Advance Period Button - Hide during in-service, pre-closing and closing */}
          {onAdvancePeriod && !allTasksCompleted && period?.id !== 'lunch-service' && period?.id !== 'dinner-service' && period?.id !== 'pre-closing' && period?.id !== 'closing' && (
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
                  const isCompleted = (completedTaskIds || []).includes(task.id)
                  const isCurrentSlide = index === selectedIndex
                  const isAuditTask = task.uploadRequirement === '审核' && task.autoGenerated
                  
                  // Check if any linked tasks have been submitted
                  const hasLinkedSubmissions = task.linkedTasks && task.linkedTasks.some(linkedTaskId => 
                    submissions.some(sub => sub.taskId === linkedTaskId)
                  )
                  
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
                        border: theme => isAuditTask && hasLinkedSubmissions
                          ? `2px solid ${theme.palette.warning.main}` // Orange border when duty manager submitted
                          : isAuditTask
                          ? `2px dashed ${theme.palette.grey[400]}` // Dashed border for audit tasks initially
                          : task.isFloating 
                          ? `2px solid ${theme.palette.warning.main}` // Orange border for floating tasks
                          : isCurrentSlide ? `2px solid ${theme.palette.primary.main}` : '1px solid',
                        borderColor: isAuditTask && hasLinkedSubmissions
                          ? 'warning.main'
                          : task.isFloating 
                          ? 'warning.main' // Orange for floating tasks
                          : isCompleted ? 'success.main' : 'divider',
                        borderRadius: 2,
                        p: 3,
                        backgroundColor: isAuditTask && hasLinkedSubmissions
                          ? theme => alpha(theme.palette.warning.main, 0.05)
                          : isCompleted ? 'action.hover' : 'background.paper',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        opacity: isCompleted ? 0.7 : 1,
                        transform: isCurrentSlide ? 'scale(1)' : 'scale(0.92)',
                        transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease, border 0.3s ease, background-color 0.3s ease',
                        pointerEvents: 'auto',  // Ensure pointer events work
                        touchAction: 'manipulation'  // Better touch handling
                      }}>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h5" fontWeight="bold">
                              {task.title}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                              {task.isFloating && (
                                <Chip 
                                  label="特殊任务" 
                                  size="small" 
                                  color="warning"
                                />
                              )}
                              {isAuditTask && !hasLinkedSubmissions && (
                                <Chip 
                                  label="等待提交" 
                                  size="small" 
                                  color="default"
                                  icon={<RateReviewIcon sx={{ fontSize: 16 }} />}
                                />
                              )}
                              {isAuditTask && hasLinkedSubmissions && !isCompleted && (
                                <Chip 
                                  label="待审核" 
                                  size="small" 
                                  color="warning"
                                  icon={<PendingActionsIcon sx={{ fontSize: 16 }} />}
                                />
                              )}
                            </Box>
                          </Box>
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
                              <Chip
                                size="small"
                                icon={
                                  task.uploadRequirement === '拍照' ? <PhotoCamera /> :
                                  task.uploadRequirement === '录音' ? <Videocam /> :
                                  task.uploadRequirement === '记录' ? <TextFields /> :
                                  task.uploadRequirement === '列表' ? <Checklist /> :
                                  task.uploadRequirement === '审核' ? <RateReviewIcon /> :
                                  <Comment />
                                }
                                label={task.uploadRequirement}
                                color={task.uploadRequirement === '审核' && hasLinkedSubmissions ? 'warning' : 'default'}
                              />
                            </Box>
                          </Box>
                        )}
                        
                        {!isCompleted && (
                          <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            size="large"
                            onClick={() => {
                              // Check if task requires photo or audio evidence
                              if (task.uploadRequirement === '拍照') {
                                setActiveTask(task)
                                setPhotoDialogOpen(true)
                              } else if (task.uploadRequirement === '录音') {
                                setActiveTask(task)
                                setAudioDialogOpen(true)
                              } else if (task.uploadRequirement === '记录') {
                                setActiveTask(task)
                                setTextDialogOpen(true)
                              } else if (task.uploadRequirement === '列表') {
                                setActiveTask(task)
                                setListDialogOpen(true)
                              } else if (task.uploadRequirement === '审核') {
                                setActiveTask(task)
                                setReviewDialogOpen(true)
                              } else {
                                onComplete(task.id, {})
                              }
                            }}
                            sx={{ mt: 'auto' }}
                          >
                            完成任务
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

      {/* Swipe Card for Lunch Closing Period (Manager Only) */}
      {period?.id === 'lunch-closing' && onLastCustomerLeftLunch && (
        <Paper 
          elevation={2}
          sx={{
            p: 3,
            mb: 3,
            textAlign: 'center',
            background: theme => `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.08)}, ${alpha(theme.palette.success.main, 0.15)})`,
            border: theme => `1px solid ${alpha(theme.palette.success.main, 0.2)}`
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ color: 'success.dark', fontWeight: 600 }}>
            确认最后一桌客人离开
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            滑动确认后将触发值班经理的午市任务
          </Typography>
          <SwipeableLastCustomerCard onConfirm={onLastCustomerLeftLunch} />
        </Paper>
      )}
      
      {/* Swipe Card for Pre-closing Period (Manager Only) */}
      {period?.id === 'pre-closing' && onLastCustomerLeft && (
        <SwipeableLastCustomerCard onConfirm={onLastCustomerLeft} />
      )}

      {/* Closing Complete Button - Shows in same position as swipe card */}
      {period?.id === 'closing' && onClosingComplete && (
        <Paper 
          elevation={2}
          sx={{
            p: 3,
            mb: 3,
            textAlign: 'center',
            background: theme => `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.08)}, ${alpha(theme.palette.error.main, 0.15)})`,
            border: theme => `1px solid ${alpha(theme.palette.error.main, 0.2)}`
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ color: 'error.main', fontWeight: 600 }}>
            结束今天营业
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {allTasksCompleted ? '所有任务已完成，可以安全闭店' : '请先完成所有任务'}
          </Typography>
          <Button
            variant="contained"
            color="error"
            size="large"
            fullWidth
            onClick={onClosingComplete}
            sx={{ 
              py: 2,
              fontSize: '1.1rem',
              fontWeight: 'bold'
            }}
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
            {notices.map((notice, index) => {
              // Get comments for this notice
              const noticeCommentList = noticeComments.filter(c => c.noticeId === notice.id)
              const isInService = period?.id === 'lunch-service' || period?.id === 'dinner-service'
              
              return (
                <React.Fragment key={notice.id}>
                  {index > 0 && <Divider />}
                  <ListItem 
                    sx={{ 
                      px: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'stretch'
                    }}
                  >
                    <Box>
                      <ListItemText
                        primary={notice.title}
                        secondary={notice.description}
                        primaryTypographyProps={{ fontWeight: 'medium' }}
                      />
                      
                      {/* Add comment button for in-service periods */}
                      {isInService && (
                        <Box sx={{ mt: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Comment />}
                            onClick={() => {
                              setActiveNotice(notice)
                              setNoticeCommentDialogOpen(true)
                            }}
                          >
                            留言 ({noticeCommentList.length})
                          </Button>
                        </Box>
                      )}
                    </Box>
                  </ListItem>
                </React.Fragment>
              )
            })}
          </List>
        </Paper>
      )}
      
      {/* Photo Submission Dialog */}
      {activeTask && (
        <PhotoSubmissionDialog
          open={photoDialogOpen}
          taskName={activeTask.title}
          taskId={activeTask.id}
          onClose={() => {
            setPhotoDialogOpen(false)
            setActiveTask(null)
          }}
          onSubmit={(evidence) => {
            onComplete(activeTask.id, { evidence, type: 'photo' })
            setPhotoDialogOpen(false)
            setActiveTask(null)
          }}
        />
      )}
      
      {/* Audio Recording Dialog */}
      {activeTask && (
        <AudioRecordingDialog
          open={audioDialogOpen}
          taskName={activeTask.title}
          taskId={activeTask.id}
          onClose={() => {
            setAudioDialogOpen(false)
            setActiveTask(null)
          }}
          onSubmit={(transcription, audioBlob) => {
            onComplete(activeTask.id, { transcription, audioBlob, type: 'audio' })
            setAudioDialogOpen(false)
            setActiveTask(null)
          }}
        />
      )}
      
      {/* Text Input Dialog */}
      {activeTask && (
        <TextInputDialog
          open={textDialogOpen}
          taskName={activeTask.title}
          taskId={activeTask.id}
          onClose={() => {
            setTextDialogOpen(false)
            setActiveTask(null)
          }}
          onSubmit={(textInput) => {
            onComplete(activeTask.id, { textInput, type: 'text' })
            setTextDialogOpen(false)
            setActiveTask(null)
          }}
        />
      )}
      
      {/* List Submission Dialog */}
      {activeTask && (
        <ListSubmissionDialog
          open={listDialogOpen}
          taskName={activeTask.title}
          sampleDir={activeTask.role === 'Manager' ? '前厅/1-开店-开店准备与设备检查' : '后厨/1-开店-开店准备与设备检查'}
          onClose={() => {
            setListDialogOpen(false)
            setActiveTask(null)
          }}
          onSubmit={(data) => {
            onComplete(activeTask.id, { items: data.items, type: 'list' })
            setListDialogOpen(false)
            setActiveTask(null)
          }}
        />
      )}
      
      {/* Notice Comment Dialog */}
      <NoticeCommentDialog
        open={noticeCommentDialogOpen && !!activeNotice}
        noticeTitle={activeNotice?.title || ''}
        noticeId={activeNotice?.id || ''}
        existingComments={activeNotice ? noticeComments.filter(c => c.noticeId === activeNotice.id) : []}
        onClose={() => {
          setNoticeCommentDialogOpen(false)
          setActiveNotice(null)
        }}
        onSubmit={(comment) => {
          if (activeNotice) {
            onComment(activeNotice.id, comment)
            // Don't close dialog after submit to allow multiple comments
          }
        }}
      />
      
      {/* Review Task Dialog */}
      {activeTask && (
        <ReviewTaskDialog
          open={reviewDialogOpen}
          task={activeTask}
          onClose={() => {
            setReviewDialogOpen(false)
            setActiveTask(null)
          }}
          onApprove={(taskId, data) => {
            onComplete(taskId, { ...data, type: 'review' })
            setReviewDialogOpen(false)
            setActiveTask(null)
          }}
          onReject={(taskId, reason) => {
            // 处理驳回逻辑
            console.log('任务被驳回:', taskId, reason)
            // 任务保持未完成状态，不调用onComplete
            // 通过回调函数处理驳回
            if (onReviewReject) {
              onReviewReject(taskId, reason)
            }
            setReviewDialogOpen(false)
            setActiveTask(null)
          }}
        />
      )}
    </>
  )
}