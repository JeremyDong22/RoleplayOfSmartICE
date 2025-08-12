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
import { NoticeContainer } from '../components/NoticeContainer/NoticeContainer'
import { NavigationBar } from '../components/Navigation/NavigationBar'
import type { WorkflowPeriod, TaskTemplate } from '../types/task.types'
import { getCurrentPeriodFromDatabase, getNextPeriodFromDatabase } from '../services/businessCycleService'
import { useTaskData } from '../contexts/TaskDataContext'
import { getManualClosingTask } from '../services/taskService'
// import { broadcastService } from '../services/broadcastService' // Removed: Using only Supabase Realtime
import { clearAllAppStorage } from '../utils/clearAllStorage'
import { getTodayCompletedTaskIds, getTodayTaskStatuses, validateCanClose, submitTaskRecord, type TaskStatusDetail } from '../services/taskRecordService'
import { submitTaskWithMedia } from '../utils/taskSubmissionHelper'
import { supabase } from '../services/supabase'
import { authService } from '../services/authService'
import { getRestaurantId } from '../utils/restaurantSetup'
import { restaurantStateService, type RestaurantState } from '../services/restaurantStateService'

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


export const ChefDashboard: React.FC = () => {
  // Check if role is correct - keep this for navigation only
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
    const [missingTasks, setMissingTasks] = useState<{ task: TaskTemplate; periodName: string }[]>([])
    const [isManualClosing, setIsManualClosing] = useState(false)
    const [isWaitingForNextDay, setIsWaitingForNextDay] = useState(false)
    const waitingRef = useRef(false) // Ref to prevent race conditions
    const [hasInitialized, setHasInitialized] = useState(false) // Track if we've loaded initial data
    const [manuallyAdvancedPeriod, setManuallyAdvancedPeriod] = useState<string | null>(null) // Track manually advanced period ID
    const manualAdvanceRef = useRef<string | null>(null) // Ref for immediate access
    const [dbTaskStatuses, setDbTaskStatuses] = useState<TaskStatusDetail[]>([]) // Task statuses from database for TaskSummary
    const [isLoadingFromDb, setIsLoadingFromDb] = useState(true) // Loading state for database
    const [currentUserId, setCurrentUserId] = useState<string | null>(null) // Current user ID
    const [dbState, setDbState] = useState<RestaurantState | null>(null) // Restaurant state from database
    const [canManualClose, setCanManualClose] = useState(false) // Whether manual closing is allowed
    const [isCheckingClosure, setIsCheckingClosure] = useState(false) // Loading state for closure check
    const manualClosingRef = useRef(false) // Ref to prevent race conditions
    
    // 过滤只显示 Chef 的浮动任务
    const floatingTasks = allFloatingTasks.filter(task => task.role === 'Chef')
    
    // 获取手动闭店任务（特殊任务，只作为按钮显示）
    const manualClosingTask = getManualClosingTask('chef')
  
  // Load restaurant state from database
  useEffect(() => {
    if (!currentUserId) {
      return
    }
    
    const loadState = async () => {
      const restaurantId = await getRestaurantId()
      if (!restaurantId) {
        return
      }
      
      const state = await restaurantStateService.getCurrentState(restaurantId, testTime)
      
      if (state) {
        setDbState(state)
        setIsWaitingForNextDay(state.isWaitingForNextDay)
        setIsManualClosing(state.isManualClosing)
        setCanManualClose(state.canManualClose)
        
        // Update refs for immediate access
        waitingRef.current = state.isWaitingForNextDay
        manualClosingRef.current = state.isManualClosing
      }
    }
    
    loadState()
  }, [currentUserId, testTime]) // 添加 testTime 依赖

  // Load completed tasks from Supabase on mount
  useEffect(() => {
    async function loadFromDatabase() {
      try {
        // Get current user from authService instead of supabase.auth
        const currentUser = authService.getCurrentUser()
        if (!currentUser) {
          console.error('No authenticated user from authService')
          setIsLoadingFromDb(false)
          return
        }
        
        setCurrentUserId(currentUser.id)
        
        // Load today's completed tasks
        const completedIds = await getTodayCompletedTaskIds(currentUser.id)
        setCompletedTaskIds(completedIds)
        
        // Load today's task statuses for TaskSummary
        const taskStatuses = await getTodayTaskStatuses(currentUser.id)
        setDbTaskStatuses(taskStatuses)
        
        // Check for global test time
        const globalTestTime = getCurrentTestTime()
        if (globalTestTime) {
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
  
  // Period update effect - now primarily uses database state (same as Manager)
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null
    let lastPeriodId = currentPeriod?.id // Track last period to detect changes
    
    const updatePeriods = async () => {
      // Use database state if available
      if (dbState) {
        // If database says we're waiting, respect that
        if (dbState.isWaitingForNextDay) {
          setIsWaitingForNextDay(true)
          waitingRef.current = true
          // Clear current period to show waiting display
          setCurrentPeriod(null)
          // Set next period to opening for display
          const openingPeriod = workflowPeriods.find(p => p.id === 'opening')
          if (openingPeriod) {
            setNextPeriod(openingPeriod)
          } else {
            // If workflowPeriods is not loaded yet, try to get from database
            const next = getNextPeriodFromDatabase(workflowPeriods, testTime)
            setNextPeriod(next)
          }
          return
        }
        
        // If database says we're in manual closing, respect that
        if (dbState.isManualClosing) {
          setIsManualClosing(true)
          manualClosingRef.current = true
          // Get closing period
          const closingPeriod = workflowPeriods.length > 0 ? workflowPeriods[workflowPeriods.length - 1] : undefined
          if (closingPeriod) {
            setCurrentPeriod(closingPeriod)
            // Also update next period
            const next = getNextPeriodFromDatabase(workflowPeriods, testTime)
            setNextPeriod(next)
          }
          return
        }
        
        // Normal operation - use database current period and calculate next
        if (dbState.currentPeriodId) {
          const currentFromDb = workflowPeriods.find(p => p.id === dbState.currentPeriodId)
          if (currentFromDb) {
            // Check if period changed
            if (lastPeriodId && lastPeriodId !== currentFromDb.id) {
              // Reload state when period changes
              const restaurantId = await getRestaurantId()
              if (restaurantId) {
                const newState = await restaurantStateService.getCurrentState(restaurantId, testTime)
                if (newState) {
                  setIsManualClosing(newState.isManualClosing)
                  setIsWaitingForNextDay(newState.isWaitingForNextDay)
                  waitingRef.current = newState.isWaitingForNextDay
                  manualClosingRef.current = newState.isManualClosing
                }
              }
            }
            lastPeriodId = currentFromDb.id
            setCurrentPeriod(currentFromDb)
            const next = getNextPeriodFromDatabase(workflowPeriods, testTime)
            setNextPeriod(next)
          }
        } else {
          // No current period from database - we're in waiting state
          setCurrentPeriod(null)
          // Calculate next period based on current time
          const next = getNextPeriodFromDatabase(workflowPeriods, testTime)
          setNextPeriod(next)
        }
      } else {
        // No database state available yet
        // Still calculate periods based on time for display purposes
        const current = getCurrentPeriodFromDatabase(workflowPeriods, testTime)
        const next = getNextPeriodFromDatabase(workflowPeriods, testTime)
        if (current) {
          setCurrentPeriod(current)
          setNextPeriod(next)
        }
      }
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
  }, [testTime, isManualClosing, isWaitingForNextDay, manuallyAdvancedPeriod, currentPeriod, workflowPeriods, dbState])
  
  // Sync refs with state
  useEffect(() => {
    manualClosingRef.current = isManualClosing
  }, [isManualClosing])
  
  useEffect(() => {
    manualAdvanceRef.current = manuallyAdvancedPeriod
  }, [manuallyAdvancedPeriod])

  useEffect(() => {
    waitingRef.current = isWaitingForNextDay
  }, [isWaitingForNextDay])

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
        // Daily reset at 10:00 AM
        console.log('[ChefDashboard] Daily reset at 10:00 AM')
        
        // Reset all task-related states
        setTaskStatuses([])
        setCompletedTaskIds([])
        setMissingTasks([])
        
        // Always clear waiting state and manual advance state at daily reset
        setIsWaitingForNextDay(false)
        waitingRef.current = false
        setIsManualClosing(false)
        manualClosingRef.current = false
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
  
  // Missing tasks update effect - based on database (same as Manager)
  useEffect(() => {
    if (!currentPeriod || !currentUserId || isLoadingFromDb) return
    
    // Don't update missing tasks if we're in manual closing mode or have manually advanced
    // This prevents overwriting the missing tasks set during transition
    if (isManualClosing || manuallyAdvancedPeriod) {
      return
    }

    const updateMissingTasks = async () => {
      const now = testTime || new Date()
      const today = now.toISOString().split('T')[0]
      
      try {
        // Get all completed tasks for today from database
        const completedIds = await getTodayCompletedTaskIds(currentUserId)
        
        const updatedMissingTasks: { task: TaskTemplate; periodName: string }[] = []
        
        // Check all periods that have passed
        workflowPeriods.forEach(period => {
          // Skip event-driven periods as they don't end by time
          if (period.isEventDriven) return
          
          // Special handling for closing period (cross-day period)
          if (period.id === 'closing') {
            // Closing runs from 21:30 PM to 08:00 AM next day
            // At 10:20 AM, we're past the end time (08:00) but this closing period
            // belongs to yesterday, not today. We should only check today's tasks.
            
            const currentHour = now.getHours()
            const currentMinutes = now.getMinutes()
            const currentTimeInMinutes = currentHour * 60 + currentMinutes
            
            // If we're between 00:00-21:29 (before today's closing starts),
            // skip checking the closing period entirely
            if (currentTimeInMinutes < 21 * 60 + 30) {
              return
            }
            
            // If we're at 21:30 or later, this is today's closing period
            // Continue with normal checking below
          }
          
          const [periodStartHour, periodStartMinute] = period.startTime.split(':').map(Number)
          const [periodEndHour, periodEndMinute] = period.endTime.split(':').map(Number)
          
          // Create period start and end times for today
          const periodStart = new Date(now)
          periodStart.setHours(periodStartHour, periodStartMinute, 0, 0)
          
          const periodEnd = new Date(now)
          periodEnd.setHours(periodEndHour, periodEndMinute, 0, 0)
          
          // For cross-day periods, adjust the end date
          if (periodEndHour < periodStartHour) {
            // Period ends tomorrow
            periodEnd.setDate(periodEnd.getDate() + 1)
          }
          
          // Skip if this period hasn't started yet today
          if (now < periodStart) {
            return
          }
          
          // If this period has ended and it's not the current period
          if (now > periodEnd && period.id !== currentPeriod.id) {
            // Check for uncompleted tasks using database data
            period.tasks.chef.forEach((task: TaskTemplate) => {
              if (task.isNotice) return // Skip notices
              
              // Use database completedIds instead of local state
              if (!completedIds.includes(task.id)) {
                updatedMissingTasks.push({
                  task,
                  periodName: period.displayName
                })
              }
            })
          }
        })
        
        setMissingTasks(updatedMissingTasks)
        
      } catch (error) {
        console.error('Error updating missing tasks from database:', error)
      }
    }

    // Initial update
    updateMissingTasks()
    
    // Update every 30 seconds (less frequent since database calls are involved)
    const interval = setInterval(updateMissingTasks, 30000)
    
    return () => clearInterval(interval)
  }, [testTime, currentPeriod?.id, workflowPeriods, currentUserId, isLoadingFromDb, isManualClosing])
  
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
          const restaurantId = await getRestaurantId()
          if (!restaurantId) {
            console.error('No restaurant ID found')
            return
          }
          
          const result = await submitTaskWithMedia({
            taskId,
            userId: currentUserId,
            restaurantId, // Get restaurant UUID
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
    }
  }
  
  
  const handleLateSubmit = async (taskId: string, data?: any) => {
    console.log('[ChefDashboard] handleLateSubmit called:', { taskId, data, currentUserId })
    
    // Remove the task from missing tasks optimistically
    const previousMissingTasks = missingTasks
    setMissingTasks(prev => {
      const newMissingTasks = prev.filter(item => item.task.id !== taskId)
      console.log('[ChefDashboard] Updated missing tasks:', {
        before: prev.length,
        after: newMissingTasks.length,
        removedTaskId: taskId
      })
      return newMissingTasks
    })
    
    // Mark the task as completed optimistically
    const now = testTime || new Date()
    const previousTaskStatuses = taskStatuses
    const previousCompletedTaskIds = completedTaskIds
    
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
    
    // Submit late task data to Supabase
    if (currentUserId) {
      try {
        // Find the task details
        const task = currentTasks.find(t => t.id === taskId) || 
                    missingTasks.find(item => item.task.id === taskId)?.task
        
        console.log('[ChefDashboard] Found task for submission:', {
          taskId,
          taskTitle: task?.title,
          uploadRequirement: task?.uploadRequirement,
          hasData: !!data
        })
        
        if (task) {
          const restaurantId = await getRestaurantId()
          if (!restaurantId) {
            console.error('No restaurant ID found')
            return
          }
          
          const result = await submitTaskWithMedia({
            taskId,
            userId: currentUserId,
            restaurantId, // Get restaurant UUID from localStorage
            date: now.toISOString().split('T')[0],
            periodId: currentPeriod?.id || '',
            uploadRequirement: task.uploadRequirement,
            data
          })
          
          console.log('[ChefDashboard] Late task submitted successfully:', result.id)
          
          // Refresh task statuses from database for TaskSummary
          const updatedTaskStatuses = await getTodayTaskStatuses(currentUserId)
          console.log('[ChefDashboard] Refreshed task statuses from DB:', updatedTaskStatuses.length)
          setDbTaskStatuses(updatedTaskStatuses)
        }
      } catch (error) {
        // console.error('Error submitting late task to Supabase:', error)
        // If submission fails, revert the local state changes
        alert('补交失败，请重试！Late submission failed, please try again!')
        
        // Revert changes
        setMissingTasks(previousMissingTasks)
        setTaskStatuses(previousTaskStatuses)
        setCompletedTaskIds(previousCompletedTaskIds)
      }
    }
  }
  
  const handleBack = () => {
    localStorage.removeItem('selectedRole') // Keep this for navigation only
    navigate('/role-selection')
  }
  
  // Removed handleLastCustomerLeft as it's not used for Chef
  
  const handleClosingComplete = async () => {
    
    setIsCheckingClosure(true)
    
    try {
      // 移除了对floating tasks的检查，因为它们不是强制性的
      
      // Always check database state to see if we can close
      const restaurantId = await getRestaurantId()
      if (restaurantId && currentUserId) {
        const state = await restaurantStateService.getCurrentState(restaurantId, testTime)
        
        // Always validate, regardless of the state's canManualClose flag
        const { canClose, reason } = await validateCanClose(restaurantId)
      
      if (!canClose) {
        alert(reason || '还有未完成的必要任务，无法进行闭店操作。')
        return
      }
    }
    
    // Double check local state as well
    if (missingTasks.length > 0) {
      alert(`还有 ${missingTasks.length} 个未完成的任务，请先完成所有缺失任务后再闭店。`)
      return
    }
    
    // Check if current period (last/closing) tasks are all completed
    const isClosingPeriod = workflowPeriods.length > 0 && currentPeriod?.id === workflowPeriods[workflowPeriods.length - 1].id
    if (isClosingPeriod) {
      const uncompletedClosingTasks = currentPeriod.tasks.chef.filter(task => 
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
    
    // Submit manual closing task to database if it exists
    if (restaurantId && currentUserId && manualClosingTask) {
      // First check if all tasks are completed
      const canClose = await restaurantStateService.checkAllTasksCompleted(restaurantId)
      if (!canClose) {
        alert('还有任务未完成，请先完成所有任务后再闭店。')
        setIsCheckingClosure(false)
        return
      }
      
      // Record the manual closing task completion
      await submitTaskRecord({
        task_id: manualClosingTask.id,
        user_id: currentUserId,
        restaurant_id: restaurantId,
        date: (testTime || new Date()).toISOString().split('T')[0],
        submission_type: 'text',
        text_content: '手动闭店确认',
        status: 'completed',
        review_status: 'approved',  // Manual closing is auto-approved
        period_id: workflowPeriods[workflowPeriods.length - 1]?.id  // Last period
      })
      
      // Reload state after successful submission
      const newState = await restaurantStateService.getCurrentState(restaurantId, testTime)
      if (newState) {
        setIsManualClosing(newState.isManualClosing)
        setIsWaitingForNextDay(newState.isWaitingForNextDay)
        waitingRef.current = newState.isWaitingForNextDay
        manualClosingRef.current = newState.isManualClosing
      }
    }
    
    // Clear all data and reset to tomorrow's opening
    React.startTransition(() => {
      setTaskStatuses([])
      setCompletedTaskIds([])
      setMissingTasks([])
      setIsManualClosing(false)
      manualClosingRef.current = false // Clear ref too
      // Clear manual advance state to prevent conflicts
      setManuallyAdvancedPeriod(null)
      manualAdvanceRef.current = null
      setIsWaitingForNextDay(true) // Set waiting state BEFORE clearing period
      setCurrentPeriod(null) // Clear current period - should show waiting display
      
      // Set next period to tomorrow's opening
      const openingPeriod = workflowPeriods.find(p => p.id === 'opening')
      if (openingPeriod) {
        setNextPeriod(openingPeriod)
      }
    })
    } catch (error) {
      console.error('[ChefDashboard] Error during closure check:', error)
      alert('检查闭店条件时出错，请重试。')
    } finally {
      setIsCheckingClosure(false)
    }
  }
  
  // Removed: handleAdvancePeriod - advance button removed from UI

  // 添加重置任务功能（用于测试）
  const handleResetTasks = () => {
    // 清空所有任务相关状态
    setTaskStatuses([])
    setCompletedTaskIds([])
    setMissingTasks([])
    setIsManualClosing(false)
    manualClosingRef.current = false
    setManuallyAdvancedPeriod(null)
    manualAdvanceRef.current = null
    setIsWaitingForNextDay(false)
    waitingRef.current = false
    
    // 保持当前时段不变，但重新初始化
    const now = testTime || new Date()
    const newPeriod = getCurrentPeriodFromDatabase(workflowPeriods, now)
    setCurrentPeriod(newPeriod)
    setNextPeriod(getNextPeriodFromDatabase(workflowPeriods, now))
  }
  
  // Combine current period tasks with floating tasks for unified display
  // In pre-closing period, also include missing tasks from previous periods
  let baseTasks = currentPeriod?.tasks.chef || []
  
  if (currentPeriod?.id === 'pre-closing') {
    // In pre-closing period, include missing tasks from previous periods
    const missingTasksOnly = missingTasks.map(item => item.task)
    baseTasks = [...baseTasks, ...missingTasksOnly]
  }
  
  const allTasks = [...baseTasks, ...floatingTasks]
  // 分离常规任务和注意事项
  const currentTasks = allTasks.filter(task => !task.isNotice)
  const notices = allTasks.filter(task => task.isNotice)
  
  // 检查是否为服务时段
  const isServicePeriod = currentPeriod?.id === 'lunch-service' || currentPeriod?.id === 'dinner-service'
  
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
        <Toolbar sx={{ py: 1 }}>
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
      
      <Container maxWidth="xl" sx={{ 
        mt: 3, 
        pb: 12, 
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        alignItems: 'center'
      }}>
        <Grid container spacing={2} sx={{ width: '100%' }}>
          {/* Task Countdown - Main focus */}
          <Grid size={{ xs: 12, lg: (currentPeriod && !isWaitingForNextDay) ? 7 : 12 }}>
            {currentPeriod && !isWaitingForNextDay ? (
              <>
                <TaskCountdown
                  period={currentPeriod}
                  tasks={currentTasks}
                  completedTaskIds={completedTaskIds}
                  testTime={testTime}
                  onComplete={handleTaskComplete}
                  // Removed: onLastCustomerLeft - duty tasks auto-assigned
                  onClosingComplete={undefined} // Chef doesn't need closing button in TaskCountdown
                  // Removed: onAdvancePeriod - advance button removed from UI
                  renderNotices={() => 
                    notices.length > 0 ? (
                      <NoticeContainer
                        notices={notices}
                        isServicePeriod={isServicePeriod}
                      />
                    ) : null
                  }
                />
                
                {/* Show manual closing button in the last period (closing) if the task exists */}
                {workflowPeriods.length > 0 && currentPeriod.id === workflowPeriods[workflowPeriods.length - 1].id && manualClosingTask && (
                  <Paper elevation={2} sx={{ p: 3, mt: 3, textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom sx={{ color: 'success.main' }}>
                      {manualClosingTask.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {manualClosingTask.description}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                      系统将自动检查所有任务是否完成
                    </Typography>
                    <Button
                      variant="contained"
                      color="error"
                      fullWidth
                      size="large"
                      onClick={handleClosingComplete}
                      disabled={isCheckingClosure}
                      sx={{ 
                        py: 2,
                        fontSize: '1.1rem',
                        fontWeight: 'bold'
                      }}
                    >
                      {isCheckingClosure ? (
                        <>
                          <CircularProgress size={24} sx={{ mr: 1, color: 'inherit' }} />
                          正在检查...
                        </>
                      ) : (
                        manualClosingTask.title
                      )}
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
      
      {/* Navigation Bar */}
      <NavigationBar role="chef" />
    </>
  )
  } catch (error) {
    throw error // Re-throw to be caught by error boundary
  }
}