// Task countdown component with Embla Carousel for smooth swiping
// Updated: Fixed free dragging in Embla Carousel by removing containScroll constraints,
// adjusting flex properties, and using minHeight instead of fixed height to allow users 
// to swipe freely between all task cards at any time
// Updated: Removed SwipeableLastCustomerCard and all sliding functionality for duty assignment
// as duty tasks are now automatically assigned based on time, not manual swipe actions
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
  alpha,
  CircularProgress
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
  Checklist,
  HourglassEmpty
} from '@mui/icons-material'
import type { TaskTemplate, WorkflowPeriod } from '../../types/task.types'

import useEmblaCarousel from 'embla-carousel-react'
import { TaskSubmissionDialog } from '../TaskSubmissionDialog'
import { ReviewTaskDialog } from '../ReviewTaskDialog/ReviewTaskDialog'
import { TodayRecordsDialog } from '../TodayRecordsDialog/TodayRecordsDialog'
import { useDutyManager } from '../../contexts/DutyManagerContext'
import RateReviewIcon from '@mui/icons-material/RateReview'
import PendingActionsIcon from '@mui/icons-material/PendingActions'
import HistoryIcon from '@mui/icons-material/History'
import { specialTaskTheme } from '../../theme/specialTaskTheme'

// Removed SwipeableLastCustomerCard component - no longer needed as duty tasks are automatically assigned

interface TaskCountdownProps {
  period: WorkflowPeriod
  tasks: TaskTemplate[]
  completedTaskIds: string[]
  testTime?: Date
  onComplete: (taskId: string, data: any) => void
  // Removed: onLastCustomerLeft and onLastCustomerLeftLunch - duty tasks now auto-assigned
  // Removed: onClosingComplete - moved to ManagerDashboard as separate component
  // Removed: noticeComments and onComment - notice reply UI removed
  // Removed: onAdvancePeriod - advance button removed from UI
  onReviewReject?: (taskId: string, reason: string) => void
  hideTimer?: boolean  // 新增: 隐藏倒计时器
  reviewStatus?: {
    [taskId: string]: {
      status: 'pending' | 'approved' | 'rejected'
      reviewedAt?: Date
      reason?: string
    }
  }
  previousSubmissions?: { [taskId: string]: any } // 新增：支持传入之前的提交数据
  renderNotices?: () => React.ReactNode // 新增：在时间和任务之间渲染通知的回调
}

export const TaskCountdown: React.FC<TaskCountdownProps> = ({
  period,
  tasks,
  completedTaskIds,
  testTime,
  onComplete,
  // Removed: onLastCustomerLeft, onLastCustomerLeftLunch, onClosingComplete, noticeComments, onComment, onAdvancePeriod
  onReviewReject,
  hideTimer = false,
  reviewStatus = {},
  previousSubmissions = {},
  renderNotices
}) => {
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [currentTime, setCurrentTime] = useState<Date>(testTime || new Date())
  const [selectedIndex, setSelectedIndex] = useState(0)
  const prevPeriodRef = React.useRef(period?.id)
  const { submissions } = useDutyManager()
  
  // Track submissions updates
  useEffect(() => {
    // Removed console.log to reduce noise
  }, [submissions])
  
  // Dialog states
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false)
  const [audioDialogOpen, setAudioDialogOpen] = useState(false)
  const [textDialogOpen, setTextDialogOpen] = useState(false)
  const [listDialogOpen, setListDialogOpen] = useState(false)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [recordsDialogOpen, setRecordsDialogOpen] = useState(false)
  const [activeTask, setActiveTask] = useState<TaskTemplate | null>(null)
  const [recordsTaskId, setRecordsTaskId] = useState<string | null>(null)
  
  // Random inspection states
  const [selectedZone, setSelectedZone] = useState<string | null>(null)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  
  // Track submitting tasks to show loading state
  const [submittingTaskIds, setSubmittingTaskIds] = useState<Set<string>>(new Set())
  // Track floating tasks that just completed for animation
  const [completedFloatingTasks, setCompletedFloatingTasks] = useState<Set<string>>(new Set())
  
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
    // speed: 25,  // Increased speed for snappier animations
    duration: 200  // Faster animation duration (in ms)
  })
  
  // Separate tasks and notices
  const regularTasks = Array.isArray(tasks) ? tasks.filter(t => t && !t.isNotice) : []
  const notices = Array.isArray(tasks) ? tasks.filter(t => t && t.isNotice) : []
  
  
  
  const allTasksCompleted = regularTasks.length > 0 && regularTasks.every(task => (completedTaskIds || []).includes(task.id))
  
  // Wrapped onComplete function to handle loading state
  const handleTaskComplete = async (taskId: string, data: any) => {
    const task = regularTasks.find(t => t.id === taskId)
    if (!task) return
    
    // Set submitting state
    setSubmittingTaskIds(prev => new Set(prev).add(taskId))
    
    try {
      // Call the original onComplete
      await onComplete(taskId, data)
      
      // Handle floating task animation
      if (task.isFloating) {
        setCompletedFloatingTasks(prev => new Set(prev).add(taskId))
        
        // Remove from completed state after animation
        setTimeout(() => {
          setCompletedFloatingTasks(prev => {
            const next = new Set(prev)
            next.delete(taskId)
            return next
          })
        }, 2000) // 2 seconds for animation
      }
    } finally {
      // Remove submitting state
      setSubmittingTaskIds(prev => {
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })
    }
  }
  
  // Helper function to determine the correct sample directory for list tasks
  const getSampleDirForTask = (task: TaskTemplate): string => {
    if (task.title.includes('开店准备与设备检查')) {
      return task.role === 'Manager' ? '前厅/1-开店-开店准备与设备检查' : '后厨/1-开店-开店准备与设备检查'
    }
    if (task.title.includes('开市寻店验收 - 物资准备')) {
      return '前厅/2 - 开市寻店验收 - 物资准备'
    }
    if (task.title.includes('开市寻店验收') && task.title.includes('物资准备')) {
      return '前厅/5-餐前准备晚市-开市寻店验收 - 物资准备'
    }
    // Default fallback
    return task.role === 'Manager' ? '前厅/1-开店-开店准备与设备检查' : '后厨/1-开店-开店准备与设备检查'
  }
  
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
  
  // Update currentTime continuously
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(testTime || new Date())
    }
    
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [testTime])
  
  // Calculate time remaining for countdown periods
  useEffect(() => {
    const calculateTime = () => {
      const now = testTime || new Date()
      
      // For event-driven periods, show current time instead of countdown
      if (!period || period.isEventDriven || !period.endTime) {
        // Current time is now handled by the separate effect above
        return
      }
      
      const [endHour, endMinute] = period.endTime.split(':').map(Number)
      const [startHour, startMinute] = period.startTime ? period.startTime.split(':').map(Number) : [0, 0]
      
      const endTime = new Date(now)
      endTime.setHours(endHour, endMinute, 0, 0)
      
      // Handle cross-day periods (e.g., 21:30 to 08:00)
      // If end time is earlier than start time, it means the period crosses midnight
      if (endHour < startHour || (endHour === startHour && endMinute < startMinute)) {
        // If current time is after start time (e.g., 22:00), end time is tomorrow
        if (now.getHours() >= startHour || now.getHours() < endHour) {
          if (now.getHours() >= startHour) {
            // We're in the evening part, end time is tomorrow
            endTime.setDate(endTime.getDate() + 1)
          }
          // else we're in the morning part, end time is today
        }
      } else {
        // Normal period within the same day
        // If we've already passed the end time, it's actually tomorrow's period
        if (now > endTime) {
          setTimeRemaining({ hours: 0, minutes: 0, seconds: 0 })
          return
        }
      }
      
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
  }, [period?.id, period?.endTime, period?.startTime, period?.isEventDriven, testTime])
  
  // Get urgency level
  const getUrgencyLevel = () => {
    if (!period || period.isEventDriven || !period.endTime) return 'normal'
    
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
    return null
  }
  
  return (
    <>
      {/* Period Timer */}
      {!hideTimer && (
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
              {period?.isEventDriven || !period?.endTime ? (
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
          
          {/* Advance Period Button - Removed as requested */}
        </Box>
      </Paper>
      )}

      {/* Render notices between timer and tasks if provided */}
      {renderNotices && renderNotices()}

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
                  const taskReviewStatus = reviewStatus[task.id]
                  const isRejected = taskReviewStatus?.status === 'rejected'
                  const isApproved = taskReviewStatus?.status === 'approved'
                  const isDutyManagerTask = task.role === 'DutyManager'
                  const isInReview = isDutyManagerTask && taskReviewStatus?.status === 'pending'
                  const isSubmitting = submittingTaskIds.has(task.id)
                  const isFloatingCompleted = completedFloatingTasks.has(task.id)
                  
                  // Check if any linked tasks have been submitted
                  const hasLinkedSubmissions = task.linkedTasks && task.linkedTasks.some(linkedTaskId => {
                    const hasSubmission = submissions.some(sub => sub.taskId === linkedTaskId)
                    const linkedReviewStatus = reviewStatus[linkedTaskId]
                    // If linked task is rejected, don't count it as having submission
                    if (linkedReviewStatus?.status === 'rejected') {
                      // console.log(`Linked task ${linkedTaskId} is rejected, not counting as submission`)
                      return false
                    }
                    // If linked task is approved, also don't count it (审核已完成)
                    if (linkedReviewStatus?.status === 'approved') {
                      // console.log(`Linked task ${linkedTaskId} is approved, not counting as pending submission`)
                      return false
                    }
                    return hasSubmission
                  })
                  
                  // Debug logging
                  if (isAuditTask || isDutyManagerTask) {
                    // console.log(`Task ${task.id}:`, {
                    //   isAuditTask,
                    //   isDutyManagerTask,
                    //   hasLinkedSubmissions,
                    //   isCompleted,
                    //   isRejected,
                    //   isApproved,
                    //   reviewStatus: taskReviewStatus,
                    //   submissions: task.linkedTasks ? submissions.filter(s => task.linkedTasks?.includes(s.taskId)) : []
                    // })
                  }
                  
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
                        border: theme => {
                          // 审核任务的边框逻辑
                          if (isAuditTask) {
                            if (hasLinkedSubmissions && !isCompleted) return `2px solid ${theme.palette.warning.main}` // 待审核
                            if (!hasLinkedSubmissions) return `2px solid ${theme.palette.grey[400]}` // 等待提交 - 改为实线
                          }
                          // 值班经理任务的边框逻辑
                          if (isDutyManagerTask) {
                            if (isRejected) return `2px solid ${theme.palette.error.main}` // 待修改
                            if (isInReview) return `2px solid ${theme.palette.warning.main}` // 待审核
                            if (isApproved) return `2px solid ${theme.palette.success.main}` // 已通过
                          }
                          // 其他任务的边框逻辑
                          if (task.isFloating) return `2px solid ${specialTaskTheme.primary}`
                          if (isCurrentSlide) return `2px solid ${theme.palette.primary.main}`
                          return '1px solid'
                        },
                        borderColor: isAuditTask && hasLinkedSubmissions && !isCompleted
                          ? 'warning.main'
                          : isDutyManagerTask && isRejected
                          ? 'error.main'
                          : isDutyManagerTask && isInReview
                          ? 'warning.main'
                          : isDutyManagerTask && isApproved
                          ? 'success.main'
                          : task.isFloating 
                          ? specialTaskTheme.primary
                          : isCompleted ? 'success.main' : 'divider',
                        borderRadius: 2,
                        p: 3,
                        backgroundColor: theme => {
                          // 待审核的值班经理任务使用半透明背景
                          if (isDutyManagerTask && isInReview) {
                            return 'rgba(255, 255, 255, 0.7)'
                          }
                          // 所有任务都使用纯白背景，不要毛玻璃效果
                          if (isFloatingCompleted) {
                            return theme.palette.success.light
                          }
                          if (isCompleted && !isDutyManagerTask && !isAuditTask && !task.isFloating) {
                            return theme.palette.action.hover
                          }
                          return theme.palette.background.paper
                        },
                        // 待审核的值班经理任务添加毛玻璃效果
                        ...(isDutyManagerTask && isInReview ? {
                          backdropFilter: 'blur(8px)',
                          WebkitBackdropFilter: 'blur(8px)', // Safari支持
                          position: 'relative',
                          overflow: 'hidden',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.2) 100%)',
                            pointerEvents: 'none',
                            zIndex: 0,
                          },
                          '& > *': {
                            position: 'relative',
                            zIndex: 1,
                          }
                        } : {}),
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        opacity: isFloatingCompleted ? 0.8 : (isCompleted && !isRejected && !task.isFloating) ? 0.7 : 1, // 被驳回的任务不降低透明度
                        transform: isFloatingCompleted ? 'scale(0.98)' : isCurrentSlide ? 'scale(1)' : 'scale(0.92)',
                        transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease, border 0.3s ease, background-color 0.3s ease',
                        pointerEvents: 'auto',  // Ensure pointer events work
                        touchAction: 'manipulation'  // Better touch handling
                      }}>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="h5" fontWeight="bold">
                                {task.title}
                              </Typography>
                              {/* 历史记录按钮 - 只对浮动任务显示 */}
                              {task.isFloating === true && (
                                <Button
                                  size="small"
                                  variant="text"
                                  startIcon={<HistoryIcon />}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setRecordsTaskId(task.id)
                                    setRecordsDialogOpen(true)
                                  }}
                                  sx={{ 
                                    minWidth: 'auto',
                                    ml: 1,
                                    color: specialTaskTheme.primary,
                                    '&:hover': {
                                      backgroundColor: alpha(specialTaskTheme.primary, 0.08)
                                    }
                                  }}
                                >
                                  记录
                                </Button>
                              )}
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                              {task.isFloating && (
                                <Chip 
                                  label="特殊任务" 
                                  size="small" 
                                  sx={{
                                    backgroundColor: specialTaskTheme.chip.background,
                                    color: specialTaskTheme.chip.color,
                                    fontWeight: 500
                                  }}
                                />
                              )}
                              {isAuditTask && !hasLinkedSubmissions && !isCompleted && (
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
                              {isAuditTask && isCompleted && (
                                <Chip 
                                  label="已完成" 
                                  size="small" 
                                  color="success"
                                  icon={<CheckCircle sx={{ fontSize: 16 }} />}
                                />
                              )}
                              {/* 值班经理任务状态标签 */}
                              {isDutyManagerTask && isInReview && !isRejected && !isApproved && (
                                <Chip 
                                  label="待审核" 
                                  size="small" 
                                  color="warning"
                                  icon={<PendingActionsIcon sx={{ fontSize: 16 }} />}
                                />
                              )}
                              {isDutyManagerTask && isApproved && (
                                <Chip 
                                  label="已通过" 
                                  size="small" 
                                  color="success"
                                  icon={<CheckCircle sx={{ fontSize: 16 }} />}
                                />
                              )}
                              {isRejected && (
                                <Chip 
                                  label="待修改" 
                                  size="small" 
                                  color="error"
                                  icon={<TextFields sx={{ fontSize: 16 }} />}
                                />
                              )}
                            </Box>
                          </Box>
                          {/* 根据不同状态显示不同的图标 */}
                          {isDutyManagerTask && isApproved && (
                            <CheckCircle sx={{ color: 'success.main', fontSize: 30, ml: 1 }} />
                          )}
                          {isDutyManagerTask && (isInReview || (isCompleted && !isApproved && !isRejected)) && (
                            <HourglassEmpty sx={{ color: 'warning.main', fontSize: 30, ml: 1 }} />
                          )}
                          {!isDutyManagerTask && isCompleted && (
                            <CheckCircleOutline sx={{ color: 'success.main', fontSize: 30, ml: 1 }} />
                          )}
                        </Box>
                        
                        {task.description && (
                          <Typography variant="body1" color="text.secondary" paragraph sx={{ flex: 1 }}>
                            {task.description}
                          </Typography>
                        )}
                        
                        {/* 显示驳回原因 - 只有值班经理任务才显示驳回原因 */}
                        {isDutyManagerTask && isRejected && taskReviewStatus?.reason && (
                          <Box 
                            sx={{ 
                              p: 2, 
                              mb: 2,
                              bgcolor: 'error.50',
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'error.main'
                            }}
                          >
                            <Typography variant="subtitle2" color="error.main" gutterBottom>
                              驳回原因：
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {taskReviewStatus.reason}
                            </Typography>
                          </Box>
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
                                color='default'
                              />
                            </Box>
                          </Box>
                        )}
                        
                        {/* 按钮显示逻辑 - 审核任务和普通任务分开处理 */}
                        {isAuditTask ? (
                          // 审核任务的按钮逻辑
                          // 只有在有待审核内容且任务未完成时才显示按钮
                          hasLinkedSubmissions && !isCompleted && (
                            <Button
                              variant="contained"
                              color="primary"
                              fullWidth
                              size="large"
                              onClick={() => {
                                setActiveTask(task)
                                setReviewDialogOpen(true)
                              }}
                              sx={{ mt: 'auto' }}
                            >
                              去审核
                            </Button>
                          )
                        ) : (
                          // 非审核任务的按钮逻辑（包括值班经理任务）
                          // Show button for incomplete tasks, floating tasks, or rejected duty tasks
                          // Hide button for duty manager tasks that are in pending review
                          (!isCompleted || task.isFloating || (isDutyManagerTask && isRejected)) && !isFloatingCompleted && !(isDutyManagerTask && isInReview) && (
                            <Button
                              variant="contained"
                              color={
                                isFloatingCompleted ? "success" :
                                isDutyManagerTask && isRejected ? "error" : 
                                "primary"
                              }
                              fullWidth
                              size="large"
                              disabled={isSubmitting || isFloatingCompleted}
                              onClick={() => {
                                if (isSubmitting) return

                                // Check if task is random inspection
                                if (task.isRandomInspection) {
                                  // Randomly select zone and table
                                  const zones = ['A区', 'B区', 'C区']
                                  const tables = ['1', '2'] // Each zone has 2 tables
                                  const randomZone = zones[Math.floor(Math.random() * zones.length)]
                                  const randomTable = tables[Math.floor(Math.random() * tables.length)]
                                  setSelectedZone(randomZone)
                                  setSelectedTable(`${randomZone.charAt(0)}${randomTable}`) // e.g., "A1", "B2"
                                }
                                
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
                                } else {
                                  handleTaskComplete(task.id, {})
                                }
                              }}
                              sx={{ 
                                mt: 'auto',
                                position: 'relative',
                                '&.Mui-disabled': {
                                  backgroundColor: isFloatingCompleted ? 'success.main' : undefined,
                                  color: isFloatingCompleted ? 'white' : undefined
                                }
                              }}
                            >
                              {isSubmitting ? (
                                <CircularProgress size={24} color="inherit" />
                              ) : isFloatingCompleted ? (
                                <>
                                  <CheckCircle sx={{ mr: 1 }} />
                                  已提交
                                </>
                              ) : isDutyManagerTask && isRejected ? (
                                '重新提交'
                              ) : (
                                '完成任务'
                              )}
                            </Button>
                          )
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

      {/* Removed: Swipe cards for duty assignment - tasks now automatically assigned based on time */}
      {/* Removed: Closing Complete Button - moved to ManagerDashboard as separate component */}
      {/* Removed: Notices Section - moved to separate NoticeContainer component */}
      
      {/* Task Submission Dialog with Face Recognition */}
      {activeTask && (
        <TaskSubmissionDialog
          open={photoDialogOpen || audioDialogOpen || textDialogOpen || listDialogOpen}
          task={activeTask}
          initialPhotoGroups={previousSubmissions[activeTask.id]?.photoGroups}
          selectedZone={selectedZone}
          selectedTable={selectedTable}
          onClose={() => {
            setPhotoDialogOpen(false)
            setAudioDialogOpen(false)
            setTextDialogOpen(false)
            setListDialogOpen(false)
            setActiveTask(null)
            // Clear random inspection selection when closing
            setSelectedZone(null)
            setSelectedTable(null)
          }}
          onSubmit={async (taskId, data) => {
            await handleTaskComplete(taskId, data)
            // 对话框会自己关闭，这里只需要清理状态
            setActiveTask(null)
            setPhotoDialogOpen(false)
            setAudioDialogOpen(false)
            setTextDialogOpen(false)
            setListDialogOpen(false)
            // Clear random inspection selection after submission
            setSelectedZone(null)
            setSelectedTable(null)
          }}
        />
      )}
      
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
            // console.log('任务被驳回:', taskId, reason)
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
      
      {/* Today's Records Dialog */}
      {recordsTaskId && (
        <TodayRecordsDialog
          open={recordsDialogOpen}
          taskIds={[recordsTaskId]}
          onClose={() => {
            setRecordsDialogOpen(false)
            setRecordsTaskId(null)
          }}
        />
      )}
    </>
  )
}