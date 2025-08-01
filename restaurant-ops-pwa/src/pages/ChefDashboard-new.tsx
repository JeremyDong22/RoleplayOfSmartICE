// Chef Dashboard with status island and new timer display
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Container, 
  AppBar, 
  Toolbar, 
  IconButton,
  Typography,
  Paper,
  Button,
  Box,
  CircularProgress,
  Alert
} from '@mui/material'
import Grid from '@mui/material/Grid'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
// Status Island removed as requested
import { TaskCountdown } from '../components/TaskCountdown/TaskCountdown'
import { TaskSummary } from '../components/TaskSummary'
import { EditableTime } from '../components/TimeControl/EditableTime'
import { ClosedPeriodDisplay } from '../components/ClosedPeriodDisplay/ClosedPeriodDisplay'
import { getCurrentTestTime } from '../utils/globalTestTime'
import { FloatingTaskCard } from '../components/FloatingTaskCard'
import { getCurrentPeriod, getNextPeriod } from '../utils/workflowParser'
import type { WorkflowPeriod, TaskTemplate } from '../utils/workflowParser'
import { useTaskData } from '../contexts/TaskDataContext'
import { saveState, loadState, clearState } from '../utils/persistenceManager'
// import { broadcastService } from '../services/broadcastService' // Removed: Using only Supabase Realtime
import { clearAllAppStorage } from '../utils/clearAllStorage'
import { getTodayCompletedTaskIds, getTodayTaskStatuses, type TaskStatusDetail } from '../services/taskRecordService'
import { submitTaskWithMedia } from '../utils/taskSubmissionHelper'
import { supabase } from '../services/supabase'
import { getRestaurantId } from '../utils/restaurantSetup'

// Pre-load workflow markdown content for browser
const WORKFLOW_MARKDOWN_CONTENT = `# 门店日常工作流程

## 开店（10:00–10:30）

### 前厅
1. 开店准备与设备检查：更换工作服、佩戴工牌检查门店设备运转情况并查看能源余额情况（水电气）
2. 召开午会：召集门店伙伴开展早会, 清点到岗人数, 对各岗位每日工作流程遇漏的问题进行总结强调，当日需要对该问题点进行复查, 安排今日各岗位人员分工并提醒要点与容易出现疏漏的地方
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

## 闭店（21:30起）
1. 收据清点保管：清点当日收据并存放至指定位置保管
2. 营业数据记录：打印交班单并填写日营业报表数据
3. 当日复盘总结：门店管理层进行5分钟左右当日问题复盘与总结为第二天晨会做准备
4. 能源安全检查：关闭并检查门店水电气能源，确保门店能源安全
5. 安防闭店检查：锁好抽屉、门窗进行闭店上报，确保无明火，安防系统开启`

// Make it available globally for markdownParser
if (!(window as any).WORKFLOW_MARKDOWN_CONTENT) {
  ;(window as any).WORKFLOW_MARKDOWN_CONTENT = WORKFLOW_MARKDOWN_CONTENT
}

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

export const ChefDashboard: React.FC = () => {
  // Check if role is correct
  const selectedRole = localStorage.getItem('selectedRole')
  
  const navigate = useNavigate()
  
  // 从数据库获取任务数据
  const { workflowPeriods, floatingTasks: allFloatingTasks, isLoading, error } = useTaskData()
  
  // Redirect to role selection if no role is selected
  useEffect(() => {
    if (!selectedRole) {
      navigate('/')
    }
  }, [selectedRole, navigate])
  
  try {
    const [testTime, setTestTime] = useState<Date | undefined>(undefined)
    const [currentPeriod, setCurrentPeriod] = useState<WorkflowPeriod | null>(null)
    const [nextPeriod, setNextPeriod] = useState<WorkflowPeriod | null>(null)
    const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
    const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]) // Tracks ALL completed tasks across all periods
    const [noticeComments, setNoticeComments] = useState<NoticeComment[]>([])
    const [missingTasks, setMissingTasks] = useState<{ task: TaskTemplate; periodName: string }[]>([])
    const [isManualClosing, setIsManualClosing] = useState(false)
    const [isWaitingForNextDay, setIsWaitingForNextDay] = useState(false)
    const [showPreClosingComplete, setShowPreClosingComplete] = useState(false)
    const waitingRef = useRef(false) // Ref to prevent race conditions
    const [hasInitialized, setHasInitialized] = useState(false) // Track if we've loaded from localStorage
    const [manuallyAdvancedPeriod, setManuallyAdvancedPeriod] = useState<string | null>(null) // Track manually advanced period ID
    const manualAdvanceRef = useRef<string | null>(null) // Ref for immediate access
    const [dbTaskStatuses, setDbTaskStatuses] = useState<TaskStatusDetail[]>([]) // Task statuses from database for TaskSummary
    const [isLoadingFromDb, setIsLoadingFromDb] = useState(true) // Loading state for database
    const [currentUserId, setCurrentUserId] = useState<string | null>(null) // Current user ID
    
    // 过滤只显示 Chef 的浮动任务
    const floatingTasks = allFloatingTasks.filter(task => task.role === 'Chef')
  
  // Load completed tasks from Supabase on mount
  useEffect(() => {
    async function loadFromDatabase() {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          console.error('No authenticated user')
          setIsLoadingFromDb(false)
          return
        }
        
        setCurrentUserId(user.id)
        
        // Load today's completed tasks
        const completedIds = await getTodayCompletedTaskIds(user.id)
        setCompletedTaskIds(completedIds)
        
        // Load today's task statuses for TaskSummary
        const taskStatuses = await getTodayTaskStatuses(user.id)
        setDbTaskStatuses(taskStatuses)
        
        // For now, still load some state from localStorage (will be removed later)
        const savedState = loadState('chef')
        if (savedState) {
          // Check for invalid stuck state BEFORE applying it
          if (savedState.isManualClosing && !savedState.isWaitingForNextDay) {
            savedState.isManualClosing = false
          }
          
          setNoticeComments(savedState.noticeComments)
          setIsManualClosing(savedState.isManualClosing)
          setIsWaitingForNextDay(savedState.isWaitingForNextDay)
          waitingRef.current = savedState.isWaitingForNextDay
          setManuallyAdvancedPeriod(savedState.manuallyAdvancedPeriod || null)
          manualAdvanceRef.current = savedState.manuallyAdvancedPeriod || null
          
          if (savedState.testTime) {
            setTestTime(new Date(savedState.testTime))
          }
        }
        
        // Check for global test time
        const globalTestTime = getCurrentTestTime()
        if (globalTestTime && !savedState?.testTime) {
          setTestTime(globalTestTime)
        }
        
      } catch (error) {
        console.error('Error loading from database:', error)
      } finally {
        setIsLoadingFromDb(false)
        setHasInitialized(true)
      }
    }
    
    if (!hasInitialized) {
      loadFromDatabase()
    }
  }, [hasInitialized])
  
  // Listen for clear storage broadcast from other tabs - REMOVED: Using only Supabase Realtime
  // useEffect(() => {
  //   const unsubscribe = broadcastService.subscribe('CLEAR_ALL_STORAGE', (message) => {
  //     // Clear all storage and reload
  //     clearAllAppStorage()
  //     window.location.reload()
  //   })
  //   
  //   return () => {
  //     unsubscribe()
  //   }
  // }, [])
  
  // Save state to localStorage whenever key states change
  useEffect(() => {
    if (hasInitialized) {
      saveState('chef', {
        completedTaskIds,
        taskStatuses,
        noticeComments,
        missingTasks,
        isManualClosing,
        isWaitingForNextDay,
        manuallyAdvancedPeriod,
        testTime: testTime?.toISOString() || null
      })
    }
  }, [completedTaskIds, taskStatuses, noticeComments, missingTasks, isManualClosing, isWaitingForNextDay, manuallyAdvancedPeriod, testTime, hasInitialized])
  
  // Helper function to get next period for Chef (only special case for closing)
  const getNextPeriodForChef = (currentTime?: Date) => {
    const current = getCurrentPeriod(currentTime)
    const normalNext = getNextPeriod(currentTime)
    
    // Special case: if we're in closing, show opening as next period
    if (current?.id === 'closing' && normalNext?.id === 'opening') {
      // Chef shows opening as next period after closing
      return workflowPeriods.find(p => p.id === 'opening') || null
    }
    
    // For all other cases, use normal next period logic
    return normalNext
  }
  
  // Period update effect
  useEffect(() => {
    const updatePeriods = () => {
      // IMPORTANT: Check waiting state FIRST before manual advance
      // Check waitingRef first for immediate feedback
      if (waitingRef.current || isWaitingForNextDay) {
        const current = getCurrentPeriod(testTime)
        // Still update next period for display even in waiting state
        setNextPeriod(getNextPeriodForChef(testTime))
        
        // Only exit waiting state if we've reached opening time (10:00)
        if (current && current.id === 'opening') {
          waitingRef.current = false
          setIsWaitingForNextDay(false)
          setShowPreClosingComplete(false)
          // Clear any lingering manual advance state
          setManuallyAdvancedPeriod(null)
          manualAdvanceRef.current = null
          setCurrentPeriod(current)
          setNextPeriod(getNextPeriodForChef(testTime))
        } else {
          // Update periods even in waiting state to reflect time changes
          setCurrentPeriod(getCurrentPeriod(testTime))
          setNextPeriod(getNextPeriodForChef(testTime))
        }
        // Still waiting, don't update state flags
        return
      }
      
      // Check if we have a manually advanced period
      if (manualAdvanceRef.current || manuallyAdvancedPeriod) {
        const current = getCurrentPeriod(testTime)
        // Check if actual time has caught up to the manually advanced period
        if (current?.id === manualAdvanceRef.current || current?.id === manuallyAdvancedPeriod) {
          setManuallyAdvancedPeriod(null)
          manualAdvanceRef.current = null
        } else {
          return // Don't update periods while manually advanced
        }
      }
      
      // Normal period updates
      if (!isManualClosing) {
        const current = getCurrentPeriod(testTime)
        const next = getNextPeriodForChef(testTime)
        setCurrentPeriod(current)
        setNextPeriod(next)
      }
    }
    
    // Always run initial update
    updatePeriods()
    
    // Always set interval to check for period changes
    const interval = setInterval(updatePeriods, 1000)
    return () => clearInterval(interval)
  }, [testTime, isManualClosing, isWaitingForNextDay, manuallyAdvancedPeriod])
  
  // Sync refs with state
  useEffect(() => {
    waitingRef.current = isWaitingForNextDay
  }, [isWaitingForNextDay])
  
  useEffect(() => {
    manualAdvanceRef.current = manuallyAdvancedPeriod
  }, [manuallyAdvancedPeriod])

  // Subscribe to broadcast messages - REMOVED: Using only Supabase Realtime
  // useEffect(() => {
  //   const unsubscribe = broadcastService.subscribe('*', (message) => {
  //     
  //     // Handle lunch customer left message
  //     if (message.type === 'LAST_CUSTOMER_LEFT_LUNCH') {
  //       // Force refresh the current period to ensure we have the latest state
  //       const now = testTime || new Date()
  //       const newPeriod = getCurrentPeriod(now)
  //       setCurrentPeriod(newPeriod)
  //       setNextPeriod(getNextPeriodForChef(now))
  //     }
  //   })
  //   
  //   return () => {
  //     unsubscribe()
  //   }
  // }, [testTime])
  
  // Safety check: Clear invalid states
  useEffect(() => {
    // Only run this check after initialization
    if (!hasInitialized) return
    
    // Check if isManualClosing is stuck without a valid currentPeriod
    if (isManualClosing && !currentPeriod && !isWaitingForNextDay) {
      // Clear the invalid state
      setIsManualClosing(false)
      
      // Also clear manual advance state just in case
      setManuallyAdvancedPeriod(null)
      manualAdvanceRef.current = null
    }
    
    // Check if we're stuck in manual closing but not in closing period
    if (isManualClosing && currentPeriod && currentPeriod.id !== 'closing') {
      // This might be valid during transition, so just log for now
    }
  }, [hasInitialized, isManualClosing, currentPeriod, isWaitingForNextDay])
  
  // Task refresh at 10:00 AM
  useEffect(() => {
    let lastCheckedHour = new Date(testTime || new Date()).getHours()
    
    const checkForDailyReset = () => {
      const now = testTime || new Date()
      const currentHour = now.getHours()
      
      // Check if we just crossed 10:00 AM (from 9:xx to 10:xx)
      if (lastCheckedHour !== 10 && currentHour === 10) {
        // Clear localStorage
        clearState('chef')
        
        // Reset all task-related states
        setTaskStatuses([])
        setCompletedTaskIds([])
        setNoticeComments([])
        setMissingTasks([])
        setShowPreClosingComplete(false)
        
        // Always clear waiting state and manual advance state at daily reset
        setIsWaitingForNextDay(false)
        waitingRef.current = false
        setIsManualClosing(false)
        setManuallyAdvancedPeriod(null)
        manualAdvanceRef.current = null
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
    
    // Don't update missing tasks if we're in manual closing mode or have manually advanced
    // This prevents overwriting the missing tasks set during transition
    if (isManualClosing || currentPeriod.id === 'closing' || manuallyAdvancedPeriod) {
      return
    }

    const updateMissingTasks = () => {
      const now = testTime || new Date()
      const updatedMissingTasks: { task: TaskTemplate; periodName: string }[] = []
      
      // Check all periods that have passed
      workflowPeriods.forEach(period => {
        // Skip event-driven periods - they don't end by time
        if (period.isEventDriven) return
        
        const [periodEndHour, periodEndMinute] = period.endTime.split(':').map(Number)
        const periodEnd = new Date(now)
        periodEnd.setHours(periodEndHour, periodEndMinute, 0, 0)
        
        // If this period has ended and it's not the current period
        if (now > periodEnd && period.id !== currentPeriod.id) {
          // Check for uncompleted tasks using completedTaskIds
          period.tasks.chef.forEach(task => {
            // Skip notices - they are not actionable tasks
            if (task.isNotice === true) return
            // Skip floating tasks - they're always current
            if (task.isFloating === true) return
            // Skip tasks without proper structure
            if (!task.id || !task.title) return
            
            // Use completedTaskIds for consistency
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
        // Preserve manually added tasks and only update auto-detected ones
        // Keep all tasks that were manually added (through handleAdvancePeriod)
        const manuallyAddedTasks = prev.filter(item => {
          // Check if this task's period has not ended naturally yet
          const period = workflowPeriods.find(p => p.displayName === item.periodName)
          if (!period) return true // Keep if period not found
          
          const [periodEndHour, periodEndMinute] = period.endTime.split(':').map(Number)
          const periodEnd = new Date(now)
          periodEnd.setHours(periodEndHour, periodEndMinute, 0, 0)
          
          // Keep tasks from periods that haven't naturally ended yet
          return now <= periodEnd
        })
        
        // Combine manually added tasks with auto-detected ones
        const combined = [...manuallyAddedTasks, ...updatedMissingTasks]
        
        // Remove duplicates based on task ID
        const uniqueTasks = combined.filter((item, index, self) =>
          index === self.findIndex(t => t.task.id === item.task.id)
        )
        
        // Only update if the tasks have changed
        const hasChanged = prev.length !== uniqueTasks.length || 
          prev.some((item, index) => item.task.id !== uniqueTasks[index]?.task.id)
        
        return hasChanged ? uniqueTasks : prev
      })
    }

    updateMissingTasks()
    const interval = setInterval(updateMissingTasks, 5000) // Check every 5 seconds instead of every second
    
    return () => clearInterval(interval)
  }, [testTime, currentPeriod?.id, workflowPeriods, completedTaskIds, isManualClosing, manuallyAdvancedPeriod])
  
  // Overdue status update effect
  useEffect(() => {
    if (!currentPeriod || currentPeriod.id === 'closing') return
    
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
          currentPeriod.tasks.chef.forEach(task => {
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
  
  const handleTaskComplete = async (taskId: string, data: any) => {
    const now = testTime || new Date()
    
    // Submit task data to Supabase FIRST
    if (currentUserId) {
      try {
        const task = currentTasks.find(t => t.id === taskId)
        if (task) {
          const result = await submitTaskWithMedia({
            taskId,
            userId: currentUserId,
            restaurantId: getRestaurantId(), // Get restaurant UUID from localStorage
            date: now.toISOString().split('T')[0],
            periodId: currentPeriod?.id || '',
            uploadRequirement: task.uploadRequirement,
            data
          })
          
          console.log('[ChefDashboard] Task successfully submitted:', result.id)
          
          // Only update local state after successful database save
          // 注意：floating tasks不需要记录完成状态，因为它们可以无限提交
          if (!task.isFloating) {
            setTaskStatuses(prev => [
              ...prev.filter(s => s.taskId !== taskId),
              {
                taskId,
                completed: true,
                completedAt: now,
                overdue: false,
                evidence: data // Store evidence data with task status
              }
            ])
            
            const newCompletedIds = [...completedTaskIds, taskId]
            setCompletedTaskIds(newCompletedIds)
            
            // Refresh task statuses from database for TaskSummary
            const updatedTaskStatuses = await getTodayTaskStatuses(currentUserId)
            setDbTaskStatuses(updatedTaskStatuses)
            
            // Check if this is the last task in closing period for chef
            if (currentPeriod?.id === 'closing') {
              const allTasks = currentPeriod.tasks.chef.filter(t => !t.isNotice)
              const allCompleted = allTasks.every(task => newCompletedIds.includes(task.id))
              
              if (allCompleted) {
                // All closing tasks completed, show completion message
                setShowPreClosingComplete(true)
              }
            }
          } else {
            console.log('[ChefDashboard] Floating task submitted but not marked as completed (can be resubmitted)')
            
            // Still refresh task statuses for floating tasks
            const updatedTaskStatuses = await getTodayTaskStatuses(currentUserId)
            setDbTaskStatuses(updatedTaskStatuses)
          }
        }
      } catch (error) {
        console.error('[ChefDashboard] Error submitting task to Supabase:', {
          error,
          taskId,
          userId: currentUserId,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        })
        // Don't update local state if submission fails
        alert('任务提交失败，请重试！Task submission failed, please try again!')
        throw error // Re-throw to prevent marking as complete
      }
    } else {
      // Still allow local completion if no user is logged in (for testing)
      setTaskStatuses(prev => [
        ...prev.filter(s => s.taskId !== taskId),
        {
          taskId,
          completed: true,
          completedAt: now,
          overdue: false,
          evidence: data
        }
      ])
      
      const newCompletedIds = [...completedTaskIds, taskId]
      setCompletedTaskIds(newCompletedIds)
      
      // Check if this is the last task in closing period for chef
      if (currentPeriod?.id === 'closing') {
        const allTasks = currentPeriod.tasks.chef.filter(t => !t.isNotice)
        const allCompleted = allTasks.every(task => newCompletedIds.includes(task.id))
        
        if (allCompleted) {
          // All closing tasks completed, show completion message
          setShowPreClosingComplete(true)
        }
      }
    }
  }
  
  const handleNoticeComment = (noticeId: string, comment: string) => {
    const newComment: NoticeComment = {
      noticeId,
      comment,
      timestamp: testTime || new Date()
    }
    setNoticeComments(prev => [...prev, newComment])
    
    // TODO: Send comment to backend
  }
  
  const handleLateSubmit = (taskId: string, data?: any) => {
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
        overdue: false,
        evidence: data // Store submission data if provided
      }
    ])
    
    setCompletedTaskIds(prev => [...prev, taskId])
    
    // TODO: Submit late task data to backend
    if (data) {
    }
  }
  
  const handleBack = () => {
    localStorage.removeItem('selectedRole')
    navigate('/role-selection')
  }
  
  // Removed handleLastCustomerLeft as it's not used for Chef
  
  const handleClosingComplete = () => {
    // 移除了对floating tasks的检查，因为它们不是强制性的
    
    // Check if there are any missing tasks
    if (missingTasks.length > 0) {
      alert(`还有 ${missingTasks.length} 个未完成的任务，请先完成所有缺失任务后再收尾。`)
      return
    }
    
    // Confirm closing
    if (!confirm('确认要完成收尾工作吗？完成后将进入等待状态直到明天开店时间。')) {
      return
    }
    
    // Set ref immediately to prevent race conditions
    waitingRef.current = true
    
    // Clear all data and reset to tomorrow's opening
    React.startTransition(() => {
      setTaskStatuses([])
      setCompletedTaskIds([])
      setNoticeComments([])
      setMissingTasks([])
      setIsManualClosing(false)
      setShowPreClosingComplete(false)
      // Clear manual advance state to prevent conflicts
      setManuallyAdvancedPeriod(null)
      manualAdvanceRef.current = null
      setIsWaitingForNextDay(true) // Set waiting state
      setCurrentPeriod(null) // Clear current period - should show waiting display
      
      // Set next period to tomorrow's opening (Chef skips closing period)
      const openingPeriod = workflowPeriods.find(p => p.id === 'opening')
      if (openingPeriod) {
        setNextPeriod(openingPeriod)
      }
    })
  }
  
  const handleAdvancePeriod = () => {
    if (!currentPeriod) return
    
    // Find the next period in sequence
    const currentIndex = workflowPeriods.findIndex(p => p.id === currentPeriod.id)
    if (currentIndex === -1 || currentIndex >= workflowPeriods.length - 1) return
    
    const nextPeriod = workflowPeriods[currentIndex + 1]
    
    // Skip closing period for chef
    if (nextPeriod.id === 'closing') {
      const openingPeriod = workflowPeriods.find(p => p.id === 'opening')
      if (openingPeriod) {
        setIsWaitingForNextDay(true)
        setCurrentPeriod(null)
        setNextPeriod(openingPeriod)
        return
      }
    }
    
    // Collect uncompleted tasks from current period
    const uncompletedTasks: { task: TaskTemplate; periodName: string }[] = []
    currentPeriod.tasks.chef.forEach(task => {
      if (!task.isNotice && !task.isFloating && !completedTaskIds.includes(task.id)) {
        uncompletedTasks.push({
          task,
          periodName: currentPeriod.displayName
        })
      }
    })
    
    // Add to missing tasks
    if (uncompletedTasks.length > 0) {
      setMissingTasks(prev => [...prev, ...uncompletedTasks])
    }
    
    // Set manual advance flag BEFORE updating period
    setManuallyAdvancedPeriod(nextPeriod.id)
    manualAdvanceRef.current = nextPeriod.id
    
    // Force transition to next period
    setCurrentPeriod(nextPeriod)
    setNextPeriod(getNextPeriod(testTime))
  }

  // 添加重置任务功能（用于测试）
  const handleResetTasks = () => {
    // 清空所有任务相关状态
    setTaskStatuses([])
    setCompletedTaskIds([])
    setNoticeComments([])
    setMissingTasks([])
    setIsManualClosing(false)
    setShowPreClosingComplete(false)
    setManuallyAdvancedPeriod(null)
    manualAdvanceRef.current = null
    
    // 清除本地存储
    clearState('chef')
    
    // 值班经理数据现在通过数据库管理，无需清理localStorage
    
    // 保持当前时段不变，但重新初始化
    const now = testTime || new Date()
    const newPeriod = getCurrentPeriod(now)
    setCurrentPeriod(newPeriod)
    setNextPeriod(getNextPeriod(now))
  }
  
  // Combine current period tasks with floating tasks for unified display
  const currentTasks = [...(currentPeriod?.tasks.chef || []), ...floatingTasks]
  
  // 处理加载状态
  if (isLoading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>正在从数据库加载任务...</Typography>
      </Container>
    )
  }
  
  // 处理错误状态
  if (error) {
    return (
      <Container sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button variant="contained" onClick={() => window.location.reload()}>重新加载</Button>
      </Container>
    )
  }
  
  return (
    <>
      {/* App Bar */}
      <AppBar position="static" sx={{ backgroundColor: '#dc004e' }}>
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
            后厨管理
          </Typography>
          <EditableTime testTime={testTime} onTimeChange={setTestTime} onResetTasks={handleResetTasks} />
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="xl" sx={{ mt: 2, pb: 4, height: 'calc(100vh - 64px)' }}>
        <Grid container spacing={2} sx={{ height: '100%' }}>
          {/* Task Countdown - Main focus */}
          <Grid size={{ xs: 12, lg: (currentPeriod && !isWaitingForNextDay) ? 7 : 12 }}>
            {currentPeriod && !isWaitingForNextDay ? (
              <>
                <TaskCountdown
                  period={currentPeriod}
                  tasks={currentTasks}
                  completedTaskIds={completedTaskIds}
                  noticeComments={noticeComments}
                  testTime={testTime}
                  onComplete={handleTaskComplete}
                  onComment={handleNoticeComment}
                  // Removed: onLastCustomerLeft - duty tasks auto-assigned
                  onClosingComplete={undefined} // Chef doesn't need closing button in TaskCountdown
                  onAdvancePeriod={handleAdvancePeriod}
                />
                
                {/* Show completion message and button for chef when closing tasks are done */}
                {currentPeriod.id === 'closing' && showPreClosingComplete && (
                  <Paper elevation={2} sx={{ p: 3, mt: 3, textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom sx={{ color: 'success.main' }}>
                      当前状态已完成
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      所有闭店任务已完成
                    </Typography>
                    <Button
                      variant="contained"
                      color="error"
                      fullWidth
                      size="large"
                      onClick={handleClosingComplete}
                      sx={{ 
                        py: 2,
                        fontSize: '1.1rem',
                        fontWeight: 'bold'
                      }}
                    >
                      完成收尾工作
                    </Button>
                  </Paper>
                )}
              </>
            ) : (
              <ClosedPeriodDisplay 
                nextPeriod={nextPeriod} 
                testTime={testTime} 
                currentStatus={isWaitingForNextDay ? '等待开店' : undefined} 
              />
            )}
          </Grid>

          {/* Task Summary - Side panel - Only show during operating periods */}
          {currentPeriod && !isWaitingForNextDay && (
            <Grid size={{ xs: 12, lg: 5 }}>
              {/* Floating Tasks Card removed - now integrated into current tasks */}
              
              <TaskSummary 
                tasks={currentTasks}
                taskStatuses={taskStatuses}
                completedTaskIds={completedTaskIds}
                missingTasks={missingTasks}
                noticeComments={noticeComments}
                onLateSubmit={handleLateSubmit}
                testTime={testTime}
                role="chef"
                dbTaskStatuses={dbTaskStatuses}
                useDatabase={true}
              />
            </Grid>
          )}
        </Grid>
      </Container>
    </>
  )
  } catch (error) {
    throw error // Re-throw to be caught by error boundary
  }
}