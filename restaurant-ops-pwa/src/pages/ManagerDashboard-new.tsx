// Manager Dashboard with status island and new timer display
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Box, 
  Container, 
  AppBar, 
  Toolbar, 
  IconButton,
  Typography
} from '@mui/material'
import Grid from '@mui/material/Grid'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
// Status Island removed as requested
import { TaskCountdown } from '../components/TaskCountdown/TaskCountdown'
import { TaskSummary } from '../components/TaskSummary/TaskSummary'
import { EditableTime } from '../components/TimeControl/EditableTime'
import { getCurrentPeriod, getNextPeriod, loadWorkflowPeriods } from '../utils/workflowParser'
import type { WorkflowPeriod, TaskTemplate } from '../utils/workflowParser'
import { saveState, loadState, clearState } from '../utils/persistenceManager'

// Pre-load workflow markdown content for browser
const WORKFLOW_MARKDOWN_CONTENT = `# 门店日常工作流程

## 开店（10:00–10:30）

### 前厅
1. 开店准备与设备检查：更换工作服、佩戴工牌检查门店设备运转情况并查看能源余额情况（水电气）
2. 召开晨会：召集门店伙伴开展早会, 清点到岗人数, 对各岗位每日工作流程遇漏的问题进行总结强调，当日需要对该问题点进行复查, 安排今日各岗位人员分工并提醒要点与容易出现疏漏的地方
3. 员工早餐：早餐准备

### 后厨
1. 开店准备与设备检查：更换工作服、佩戴工牌检查门店设备运转情况
2. 员工早餐：早餐准备


## 餐前准备（午市）（10:35–11:25）

### 前厅
1. 卫生准备：吧台、营业区域、卫生间，清洁间的地面、台面、椅面、垃圾篓清洁无污渍、杂物、干爽清洁无异味。餐车清洁、翻台提前清洁准备
2. 食品安全检查：原材料效期检查，原材料及半成品保存情况检查
3. 物资配准备：桌面摆台、客用茶水、翻台用餐具、纸巾、餐前水果小吃
4. 开市巡店验收：由店长或当班管理根据检查清单逐一检查确保开市工作准备完毕，如有遗漏或不符合标准的立即整改

### 后厨
1. 收货验货：每种原材料上称称重、和送货单核对，要求误差在±2%以内，同时检查原材料质量情况，有腐烂、损坏、规格不合格收标准的需拒收并记录
2. 食品安全检查：原材料效期检查，原材料及半成品保存情况检查，临期或过期变质的原材料半成品需进行记录并处理
3. 食材准备：根据当日预估销售额与桌数进行备货
4. 开始巡店验收：由厨师长或当班管理根据检查清单逐一检查确保开市工作准备完毕，如有遗漏或不符合标准的立即整改

## 餐中运营（午市）（11:30–14:00）

### 前厅
1. **岗位监督管理**：确保各岗位在岗位区域内，防止人员脱岗离岗
2. **客户满意度巡查**：定期巡台观察客人用餐满意度，剖菜情况并进行桌访搜集客人意见，预防客诉问题发生
3. **人员调度管理**：根据门店情况临时进行人员调动补位
4. **数据维护推广**：执行日常数据维护工作，如引导评论，引导线上团购
5. **高峰期协调管理**：排队数量超过15桌时，协调现场提高翻台速度（加速出餐、翻台清洁、巡台撤盘等工作）

### 后厨
1. **出品质量监控**：餐中提醒各岗位按标准出品，出品时进行随机检查
2. **厨房运营巡查**：定期巡厨房查看各岗位工作情况，防止压单、丢单、操作混乱、原料交叉污染等情况
3. **异常情况处理**：遇异常情况，及时通知人员进行协助解决并与前厅沟通预防出餐慢导致客诉
4. **高峰期备货管理**：高峰日可提前在无出餐压力的情况下，进行部分原材料备货工作

## 餐后收市（午市）（14:00–14:30）

### 前厅
1. 收市清洁检查：遵循先收市再休息原则，安排人员进行卫生清扫，原材料半成品收纳，店长或当班管理人员需巡场进行检查，不合格立即整改
2. 能源管理：关闭非必要电器与能源，减少消耗
3. 员工用餐安排：安排午餐与午休

### 后厨
1. 收市清洁检查：遵循先收市再休息原则，安排人员进行卫生清扫，原材料半成品收纳，厨师长或当班管理人员需巡场检查，不合格立即整改
2. 能源管理：关闭非必要电器与能源，减少消耗
3. 员工用餐安排：安排午餐与午休

## 餐前准备（晚市）（16:30–17:00）

### 前厅
1. 卫生准备：吧台、营业区域、卫生间，清洁间的地面、台面、椅面、垃圾篓清洁无污渍、杂物、干爽清洁无异味。餐车清洁、翻台提前清洁准备
2. 食品安全检查：原材料效期检查，原材料及半成品保存情况检查
3. 物资配准备：桌面摆台、客用茶水、翻台用餐具、纸巾、餐前水果小吃
4. 开市巡店验收：根据检查清单逐一检查确保开市工作准备完毕，如有遗漏或不符合标准的立即整改

### 后厨
1. 收货验货：每种原材料上称称重、和送货单核对，要求误差在±2%以内，同时检查原材料的质量情况，有腐烂、损坏、规格不符合收标准的需拒收并记录
2. 食品安全检查：原材料效期检查，原材料及半成品保存情况检查，临期或过期变质的原材料半成品成品需进行记录并处理
3. 食材准备：根据当日预估销售额与桌数进行备货
4. 巡店验收：根据检查清单逐一检查确保开市工作准备完毕，如有遗漏或不符合标准的立即整改

## 餐中运营（晚市）（17:00–21:30）

### 前厅
1. **岗位监督管理**：确保各岗位在岗位区域内，防止人员脱岗离岗
2. **客户满意度巡查**：定期巡台观察客人用餐满意度，剖菜情况并进行桌访搜集客人意见，预防客诉问题发生
3. **人员调度管理**：根据门店情况临时进行人员调动补位
4. **数据维护推广**：执行日常数据维护工作，如引导评论，引导线上团购
5. **高峰期协调管理**：排队数量超过15桌时，协调现场提高翻台速度（加速出餐、翻台清洁、巡台撤盘等工作）

### 后厨
1. **出品质量监控**：餐中提醒各岗位按标准出品，出品时进行随机检查
2. **厨房运营巡查**：定期巡厨房查看各岗位工作情况，防止压单、丢单、操作混乱、原料交叉污染等情况
3. **异常情况处理**：遇异常情况，及时通知人员进行协助解决并与前厅沟通预防出餐慢导致客诉
4. **次日备货准备**：高峰日可提前在无出餐压力的情况下，进行第二天部分原材料备货工作

## 预打烊（晚市）（21:30起）
1. 收市准备：先收市再休息，提前安排人员进行卫生清扫、原材料半成品收纳保存、物资物品收纳等工作
2. 值班安排：安排值班人员
3. 用餐安排：其他人员陆续进行晚餐就餐

## 闭店（最后一桌客人离店后）
1. 收据清点保管：清点当日收据并存放至指定位置保管
2. 营业数据记录：打印交班单并填写日营业报表数据
3. 现金清点保管：清点现金保存至指定位置
4. 当日复盘总结：门店管理层进行5分钟左右当日问题复盘与总结为第二天晨会做准备
5. 能源安全检查：关闭并检查门店水电气能源，确保门店能源安全
6. 安防闭店检查：锁好抽屉、门窗进行闭店上报，确保无明火，安防系统开启`

// Make it available globally for markdownParser
;(window as any).WORKFLOW_MARKDOWN_CONTENT = WORKFLOW_MARKDOWN_CONTENT

interface TaskStatus {
  taskId: string
  completed: boolean
  completedAt?: Date
  overdue: boolean
}

interface NoticeComment {
  noticeId: string
  comment: string
  timestamp: Date
}

// Component for displaying closed period with countdown
const ClosedPeriodDisplay: React.FC<{ nextPeriod: WorkflowPeriod | null; testTime?: Date }> = ({ nextPeriod, testTime }) => {
  const [timeUntilNext, setTimeUntilNext] = useState<{ hours: number; minutes: number; seconds: number } | null>(null)
  
  useEffect(() => {
    if (!nextPeriod) return
    
    const calculateTime = () => {
      const now = testTime || new Date()
      const [startHour, startMinute] = nextPeriod.startTime.split(':').map(Number)
      const nextStart = new Date(now)
      nextStart.setHours(startHour, startMinute, 0, 0)
      
      // If the next period is tomorrow
      if (now > nextStart) {
        nextStart.setDate(nextStart.getDate() + 1)
      }
      
      const timeDiff = nextStart.getTime() - now.getTime()
      
      if (timeDiff > 0) {
        const hours = Math.floor(timeDiff / (1000 * 60 * 60))
        const minutes = Math.floor((timeDiff / (1000 * 60)) % 60)
        const seconds = Math.floor((timeDiff / 1000) % 60)
        setTimeUntilNext({ hours, minutes, seconds })
      } else {
        setTimeUntilNext({ hours: 0, minutes: 0, seconds: 0 })
      }
    }
    
    calculateTime()
    const interval = setInterval(calculateTime, 1000)
    return () => clearInterval(interval)
  }, [nextPeriod, testTime])
  
  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      {nextPeriod && (
        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

          {/* Status - positioned absolutely above the circle */}
          <Typography 
            variant="overline" 
            sx={{ 
              color: 'text.disabled',
              letterSpacing: 2,
              fontSize: '0.75rem',
              position: 'absolute',
              bottom: '13.5rem', // Use rem units for flexible spacing
              whiteSpace: 'nowrap'
            }}
          >
            当前状态：休息中
          </Typography>
          
          {/* Next Period Name - also absolute, but closer to the circle */}
          <Typography 
            variant="h6" 
            sx={{ 
              color: 'text.secondary',
              fontWeight: 'normal',
              position: 'absolute',
              bottom: '11rem', // Positioned relative to the circle's 10rem height
              whiteSpace: 'nowrap'
            }}
          >
            下一阶段：{nextPeriod.displayName}
          </Typography>

          {/* Circle Container - this is the centered element */}
          <Box 
            sx={{ 
              position: 'relative',
              width: 160,
              height: 160
            }}
          >
            {/* Background Circle */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                border: theme => {
                  if (!timeUntilNext) return `3px solid ${theme.palette.primary.main}`
                  const totalMinutes = timeUntilNext.hours * 60 + timeUntilNext.minutes
                  const totalSeconds = totalMinutes * 60 + timeUntilNext.seconds
                  return `3px solid ${totalSeconds <= 300 ? theme.palette.warning.main : theme.palette.primary.main}`
                },
                opacity: 0.2,
                transition: 'all 0.3s ease'
              }}
            />
            
            {/* Countdown Time */}
            {timeUntilNext && (
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <Typography 
                  variant="h1" 
                  sx={{ 
                    fontWeight: 300,
                    fontSize: '2rem',
                    color: theme => {
                      const totalMinutes = timeUntilNext.hours * 60 + timeUntilNext.minutes
                      const totalSeconds = totalMinutes * 60 + timeUntilNext.seconds
                      return totalSeconds <= 300 ? theme.palette.warning.main : theme.palette.primary.main
                    },
                    lineHeight: 1
                  }}
                >
                  {String(timeUntilNext.hours).padStart(2, '0')}:
                  {String(timeUntilNext.minutes).padStart(2, '0')}:
                  {String(timeUntilNext.seconds).padStart(2, '0')}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  )
}

export const ManagerDashboard: React.FC = () => {
  const navigate = useNavigate()
  const [testTime, setTestTime] = useState<Date | undefined>(undefined)
  const [currentPeriod, setCurrentPeriod] = useState<WorkflowPeriod | null>(null)
  const [nextPeriod, setNextPeriod] = useState<WorkflowPeriod | null>(null)
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]) // Tracks ALL completed tasks across all periods
  const [noticeComments, setNoticeComments] = useState<NoticeComment[]>([])
  const [missingTasks, setMissingTasks] = useState<{ task: TaskTemplate; periodName: string }[]>([])
  const [isManualClosing, setIsManualClosing] = useState(false)
  const [isWaitingForNextDay, setIsWaitingForNextDay] = useState(false)
  const manualClosingRef = useRef(false) // Ref to prevent race conditions
  const [hasInitialized, setHasInitialized] = useState(false) // Track if we've loaded from localStorage
  const workflowPeriods = loadWorkflowPeriods()
  console.log('Loaded workflow periods:', workflowPeriods.map(p => ({ id: p.id, name: p.displayName })))
  
  // Load state from localStorage on mount
  useEffect(() => {
    if (!hasInitialized) {
      const savedState = loadState('manager')
      if (savedState) {
        console.log('[Persistence] Loading saved state from localStorage')
        setCompletedTaskIds(savedState.completedTaskIds)
        setTaskStatuses(savedState.taskStatuses)
        setNoticeComments(savedState.noticeComments)
        setMissingTasks(savedState.missingTasks)
        setIsManualClosing(savedState.isManualClosing)
        setIsWaitingForNextDay(savedState.isWaitingForNextDay)
        manualClosingRef.current = savedState.isManualClosing
      }
      setHasInitialized(true)
    }
  }, [hasInitialized])
  
  // Save state to localStorage whenever key states change
  useEffect(() => {
    if (hasInitialized) {
      console.log('[Persistence] Saving state to localStorage')
      saveState('manager', {
        completedTaskIds,
        taskStatuses,
        noticeComments,
        missingTasks,
        isManualClosing,
        isWaitingForNextDay
      })
    }
  }, [completedTaskIds, taskStatuses, noticeComments, missingTasks, isManualClosing, isWaitingForNextDay, hasInitialized])
  
  // Period update effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null
    
    const updatePeriods = () => {
      // Skip all updates if we're in manual closing mode (check ref for immediate value)
      if (manualClosingRef.current || isManualClosing) {
        console.log('[Period Update] Skipping - manual closing is true')
        return
      }
      
      const current = getCurrentPeriod(testTime)
      const next = getNextPeriod(testTime)
      
      console.log('[Period Update] Check:', {
        currentTimeBasedPeriod: current?.id,
        currentStatePeriod: currentPeriod?.id,
        isManualClosing,
        isWaitingForNextDay,
        timestamp: new Date().toISOString()
      })
      
      // If we're in waiting state, only exit if we've reached opening time
      if (isWaitingForNextDay) {
        if (current && current.id === 'opening') {
          console.log('[Period Update] Exiting waiting state, entering opening period')
          setIsWaitingForNextDay(false)
          setIsManualClosing(false)
          manualClosingRef.current = false
          setCurrentPeriod(current)
          setNextPeriod(next)
        }
        // Still waiting, don't update anything
        return
      }
      
      // Normal automatic period updates
      if (current?.id !== currentPeriod?.id) {
        console.log('[Period Update] Period changed from', currentPeriod?.id, 'to', current?.id)
      }
      setCurrentPeriod(current)
      setNextPeriod(next)
    }
    
    // Always run initial update
    updatePeriods()
    
    // Always set interval to check for period changes
    intervalId = setInterval(updatePeriods, 1000)
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [testTime, isManualClosing, isWaitingForNextDay])
  
  // Sync ref with state
  useEffect(() => {
    manualClosingRef.current = isManualClosing
  }, [isManualClosing])
  
  // Task refresh at 10:00 AM
  useEffect(() => {
    let lastCheckedHour = new Date(testTime || new Date()).getHours()
    
    const checkForDailyReset = () => {
      const now = testTime || new Date()
      const currentHour = now.getHours()
      
      // Check if we just crossed 10:00 AM (from 9:xx to 10:xx)
      if (lastCheckedHour !== 10 && currentHour === 10) {
        console.log('[Daily Reset] Crossing 10:00 AM - resetting all tasks')
        
        // Clear localStorage
        clearState('manager')
        
        // Reset all task-related states
        setTaskStatuses([])
        setCompletedTaskIds([])
        setNoticeComments([])
        setMissingTasks([])
        
        // If we're in waiting state, clear it
        if (isWaitingForNextDay) {
          setIsWaitingForNextDay(false)
          setIsManualClosing(false)
          manualClosingRef.current = false
        }
        
        console.log('[Daily Reset] All tasks reset for new day')
      }
      
      lastCheckedHour = currentHour
    }
    
    // Check immediately and then every second
    checkForDailyReset()
    const interval = setInterval(checkForDailyReset, 1000)
    
    return () => clearInterval(interval)
  }, [testTime, isWaitingForNextDay])
  
  // Missing tasks update effect
  useEffect(() => {
    if (!currentPeriod) return
    
    // Don't update missing tasks if we're in manual closing mode
    // This prevents overwriting the missing tasks set during transition
    if (isManualClosing || currentPeriod.id === 'closing') {
      console.log('Skipping missing tasks update during manual closing/closing period')
      return
    }

    const updateMissingTasks = () => {
      const now = testTime || new Date()
      const updatedMissingTasks: { task: TaskTemplate; periodName: string }[] = []
      
      // Check all periods that have passed
      workflowPeriods.forEach(period => {
        const [periodEndHour, periodEndMinute] = period.endTime.split(':').map(Number)
        const periodEnd = new Date(now)
        periodEnd.setHours(periodEndHour, periodEndMinute, 0, 0)
        
        // If this period has ended and it's not the current period
        // Skip pre-closing period as it doesn't end by time
        if (now > periodEnd && period.id !== currentPeriod.id && period.id !== 'pre-closing') {
          // Check for uncompleted tasks using completedTaskIds (same as manual transition)
          period.tasks.manager.forEach((task: TaskTemplate) => {
            if (task.isNotice) return // Skip notices
            
            // Use completedTaskIds for consistency with manual transition
            if (!completedTaskIds.includes(task.id)) {
              updatedMissingTasks.push({
                task,
                periodName: period.displayName
              })
            }
          })
        }
      })
      
      setMissingTasks(prev => {
        // Only update if the tasks have changed
        const hasChanged = prev.length !== updatedMissingTasks.length || 
          prev.some((item, index) => item.task.id !== updatedMissingTasks[index]?.task.id)
        
        return hasChanged ? updatedMissingTasks : prev
      })
    }

    updateMissingTasks()
    const interval = setInterval(updateMissingTasks, 5000) // Check every 5 seconds instead of every second
    
    return () => clearInterval(interval)
  }, [testTime, currentPeriod?.id, workflowPeriods, completedTaskIds, isManualClosing])
  
  // Overdue status update effect
  useEffect(() => {
    if (!currentPeriod || currentPeriod.id === 'pre-closing') return
    
    const updateOverdueStatus = () => {
      const now = testTime || new Date()
      const [endHour, endMinute] = currentPeriod.endTime.split(':').map(Number)
      const periodEnd = new Date(now)
      periodEnd.setHours(endHour, endMinute, 0, 0)
      
      if (now > periodEnd) {
        setTaskStatuses(prev => {
          let changed = false
          const updated = prev.map(status => {
            if (!status.completed && !status.overdue) {
              changed = true
              return { ...status, overdue: true }
            }
            return status
          })
          
          // Add any tasks that don't have a status yet
          currentPeriod.tasks.manager.forEach(task => {
            if (!task.isNotice && !updated.find(s => s.taskId === task.id)) {
              changed = true
              updated.push({
                taskId: task.id,
                completed: false,
                overdue: true
              })
            }
          })
          
          return changed ? updated : prev
        })
      }
    }
    
    updateOverdueStatus()
    const interval = setInterval(updateOverdueStatus, 1000)
    
    return () => clearInterval(interval)
  }, [testTime, currentPeriod])
  
  const handleTaskComplete = (taskId: string, data: any) => {
    const now = testTime || new Date()
    setTaskStatuses(prev => [
      ...prev.filter(s => s.taskId !== taskId),
      {
        taskId,
        completed: true,
        completedAt: now,
        overdue: false
      }
    ])
    
    setCompletedTaskIds(prev => [...prev, taskId])
    
    // TODO: Submit task data to backend
    console.log('Task completed:', taskId, data)
  }
  
  const handleNoticeComment = (noticeId: string, comment: string) => {
    const newComment: NoticeComment = {
      noticeId,
      comment,
      timestamp: testTime || new Date()
    }
    setNoticeComments(prev => [...prev, newComment])
    
    // TODO: Send comment to backend
    console.log('Notice comment:', noticeId, comment)
  }
  
  const handleLateSubmit = (taskId: string) => {
    // Remove the task from missing tasks
    setMissingTasks(prev => prev.filter(item => item.task.id !== taskId))
    
    // Mark the task as completed
    const now = testTime || new Date()
    setTaskStatuses(prev => [
      ...prev.filter(s => s.taskId !== taskId),
      {
        taskId,
        completed: true,
        completedAt: now,
        overdue: false
      }
    ])
    
    setCompletedTaskIds(prev => [...prev, taskId])
    
    // TODO: Open submission dialog for late task
    console.log('Late submit:', taskId)
  }
  
  const handleBack = () => {
    localStorage.removeItem('selectedRole')
    navigate('/')
  }
  
  const handleLastCustomerLeft = () => {
    console.log('=== handleLastCustomerLeft called ===')
    console.log('Current period:', currentPeriod)
    console.log('Current completedTaskIds:', completedTaskIds)
    console.log('isManualClosing before:', isManualClosing)
    
    // Force transition to closing period
    const closingPeriod = workflowPeriods.find(p => p.id === 'closing')
    console.log('Found closing period:', closingPeriod)
    
    if (closingPeriod) {
      // First, collect all missing tasks from ALL previous periods, not just pre-closing
      const allMissingTasks: { task: TaskTemplate; periodName: string }[] = []
      
      // Add existing missing tasks
      allMissingTasks.push(...missingTasks)
      
      // Add uncompleted pre-closing tasks
      if (currentPeriod?.id === 'pre-closing') {
        console.log('Processing pre-closing tasks:', currentPeriod.tasks.manager)
        currentPeriod.tasks.manager.forEach(task => {
          console.log('Checking task:', {
            id: task.id,
            title: task.title,
            isNotice: task.isNotice,
            isCompleted: completedTaskIds.includes(task.id)
          })
          
          if (task.isNotice) {
            console.log('Skipping notice:', task.title)
            return // Skip notices
          }
          
          // Check if task is completed using completedTaskIds
          if (!completedTaskIds.includes(task.id)) {
            allMissingTasks.push({
              task,
              periodName: currentPeriod.displayName
            })
            console.log('Adding uncompleted pre-closing task:', task.title)
          } else {
            console.log('Task already completed:', task.title)
          }
        })
      }
      
      console.log('All missing tasks to be set:', allMissingTasks)
      
      // Set ref immediately to prevent race conditions
      manualClosingRef.current = true
      
      // Use React's batching to ensure all state updates happen together
      // This prevents the period update effect from running between state updates
      React.startTransition(() => {
        // Set manual closing flag FIRST
        console.log('[handleLastCustomerLeft] Setting isManualClosing to true')
        setIsManualClosing(true)
        
        // Then update all other states
        console.log('[handleLastCustomerLeft] Setting currentPeriod to closing period')
        setCurrentPeriod(closingPeriod)
        setNextPeriod(null) // No next period during closing
        
        // Set all missing tasks
        setMissingTasks(allMissingTasks)
        
        // Don't clear completed tasks - they track ALL periods
        console.log('[handleLastCustomerLeft] Keeping completed tasks from all periods')
        
        // Clear any existing task statuses for a fresh start
        console.log('[handleLastCustomerLeft] Clearing task statuses')
        setTaskStatuses([])
      })
      
      console.log('=== handleLastCustomerLeft completed ===')
    } else {
      console.log('ERROR: Could not find closing period!')
    }
  }
  
  const handleClosingComplete = () => {
    // Check if there are any missing tasks
    if (missingTasks.length > 0) {
      alert(`还有 ${missingTasks.length} 个未完成的任务，请先完成所有缺失任务后再闭店。`)
      return
    }
    
    // Check if current period (closing) tasks are all completed
    if (currentPeriod?.id === 'closing') {
      const uncompletedClosingTasks = currentPeriod.tasks.manager.filter(task => 
        !task.isNotice && !completedTaskIds.includes(task.id)
      )
      if (uncompletedClosingTasks.length > 0) {
        alert(`还有 ${uncompletedClosingTasks.length} 个闭店任务未完成，请先完成所有闭店任务。`)
        return
      }
    }
    
    // Confirm closing
    if (!confirm('确认要闭店吗？闭店后将进入等待状态直到明天开店时间。')) {
      return
    }
    
    // Clear all data and reset to tomorrow's opening
    // Use React's batching to ensure all states update together
    React.startTransition(() => {
      setTaskStatuses([])
      setCompletedTaskIds([])
      setNoticeComments([])
      setMissingTasks([])
      setIsManualClosing(false)
      manualClosingRef.current = false // Clear ref too
      setIsWaitingForNextDay(true) // Set waiting state BEFORE clearing period
      setCurrentPeriod(null) // Clear current period - should show waiting display
      
      // Set next period to tomorrow's opening
      const openingPeriod = workflowPeriods.find(p => p.id === 'opening')
      if (openingPeriod) {
        setNextPeriod(openingPeriod)
      }
    })
    
    console.log('[handleClosingComplete] Transitioned to waiting state')
  }
  
  const currentTasks = currentPeriod?.tasks.manager || []
  
  console.log('ManagerDashboard state:', {
    currentPeriodId: currentPeriod?.id,
    currentPeriodName: currentPeriod?.displayName,
    isManualClosing,
    isWaitingForNextDay,
    taskCount: currentTasks.length,
    shouldShowClosedDisplay: !currentPeriod || isWaitingForNextDay
  })
  
  return (
    <>
      {/* App Bar */}
      <AppBar position="static" color="primary">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleBack}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            前厅管理
          </Typography>
          <EditableTime testTime={testTime} onTimeChange={setTestTime} />
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="xl" sx={{ mt: 2, pb: 4, height: 'calc(100vh - 64px)' }}>
        <Grid container spacing={2} sx={{ height: '100%' }}>
          {/* Task Countdown - Main focus */}
          <Grid size={{ xs: 12, lg: (currentPeriod && !isWaitingForNextDay) ? 7 : 12 }}>
            {currentPeriod && !isWaitingForNextDay ? (
              <TaskCountdown
                period={currentPeriod}
                tasks={currentTasks}
                completedTaskIds={completedTaskIds}
                testTime={testTime}
                onComplete={handleTaskComplete}
                onComment={handleNoticeComment}
                onLastCustomerLeft={handleLastCustomerLeft}
                onClosingComplete={handleClosingComplete}
              />
            ) : (
              <ClosedPeriodDisplay nextPeriod={nextPeriod} testTime={testTime} />
            )}
          </Grid>

          {/* Task Summary - Side panel - Only show during operating periods */}
          {currentPeriod && !isWaitingForNextDay && (
            <Grid size={{ xs: 12, lg: 5 }}>
              <TaskSummary 
                tasks={currentTasks}
                taskStatuses={taskStatuses}
                completedTaskIds={completedTaskIds}
                missingTasks={missingTasks}
                noticeComments={noticeComments}
                onLateSubmit={handleLateSubmit}
                testTime={testTime}
                role="manager"
              />
            </Grid>
          )}
        </Grid>
      </Container>
    </>
  )
}