// Manager Dashboard with status island and new timer display
// Updated: Added push notification support for task reminders at period start
// Updated: Added automatic creation of audit tasks when manager confirms "last customer left".
// Creates two audit tasks for lunch period (energy management and revenue verification) and
// two for dinner/closing period (energy safety check and security check). These audit tasks
// are linked to corresponding duty manager tasks for review.
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Container, 
  AppBar, 
  Toolbar, 
  IconButton,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Paper
} from '@mui/material'
import Grid from '@mui/material/Grid'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
// Status Island removed as requested
import { TaskCountdown } from '../components/TaskCountdown/TaskCountdown'
import { TaskSummary } from '../components/TaskSummary'
import { EditableTime } from '../components/TimeControl/EditableTime'
import { ClosedPeriodDisplay } from '../components/ClosedPeriodDisplay/ClosedPeriodDisplay'
import { FloatingTaskCard } from '../components/FloatingTaskCard'
import { NoticeContainer } from '../components/NoticeContainer/NoticeContainer'
import { getCurrentPeriodFromDatabase, getNextPeriodFromDatabase } from '../utils/workflowParser'
import type { WorkflowPeriod, TaskTemplate } from '../utils/workflowParser'
import { useTaskData } from '../contexts/TaskDataContext'
import { useDutyManager, type DutyManagerSubmission } from '../contexts/DutyManagerContext'
// import { broadcastService } from '../services/broadcastService' // Removed: Using only Supabase Realtime
import { getCurrentTestTime } from '../utils/globalTestTime'
import { clearAllAppStorage } from '../utils/clearAllStorage'
import notificationService from '../services/notificationService'
import { getTodayCompletedTaskIds, getCompletedTasksInRange, getTodayTaskStatuses, getTodayApprovedDutyManagerTasks, validateCanClose, type TaskStatusDetail } from '../services/taskRecordService'
import { submitTaskWithMedia } from '../utils/taskSubmissionHelper'
import { supabase } from '../services/supabase'
import { authService } from '../services/authService'
import { getRestaurantId } from '../utils/restaurantSetup'
import { restaurantStateService, type RestaurantState } from '../services/restaurantStateService'
// import { submitNoticeResponse, getTodayNoticeResponses } from '../services/noticeResponseService'
// import { recordPeriodTransition, hasManuallyClosedToday, getLatestTransition } from '../services/periodTransitionService'

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

export const ManagerDashboard: React.FC = () => {
  // Check if role is correct
  const selectedRole = localStorage.getItem('selectedRole')
  
  const navigate = useNavigate()
  const { submissions, updateReviewStatus, reviewStatus, clearTrigger, addSubmission, refreshFromDatabase } = useDutyManager()
  
  // 从数据库获取任务数据
  const { workflowPeriods, floatingTasks: allFloatingTasks, isLoading, error } = useTaskData()
  
  // 移除频繁的 submissions 监听
  
  // Redirect to role selection if no role is selected
  useEffect(() => {
    if (!selectedRole) {
      navigate('/')
    }
  }, [selectedRole, navigate])
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
  const waitingRef = useRef(false) // Ref for waiting state
  const [hasInitialized, setHasInitialized] = useState(false) // Track if we've loaded initial data
  const [manuallyAdvancedPeriod, setManuallyAdvancedPeriod] = useState<string | null>(null) // Track manually advanced period ID
  const manualAdvanceRef = useRef<string | null>(null) // Ref for immediate access
  const [reviewTasks, setReviewTasks] = useState<TaskTemplate[]>([]) // Store review tasks for duty manager
  const [isLoadingFromDb, setIsLoadingFromDb] = useState(true) // Loading state for database
  const [currentUserId, setCurrentUserId] = useState<string | null>(null) // Current user ID
  const [currentPeriodId, setCurrentPeriodId] = useState<string | null>(null) // Track current period ID for persistence
  const [dbTaskStatuses, setDbTaskStatuses] = useState<TaskStatusDetail[]>([]) // Task statuses from database for TaskSummary
  const [dbState, setDbState] = useState<RestaurantState | null>(null) // Restaurant state from database
  const [canManualClose, setCanManualClose] = useState(false) // Whether manual closing is allowed
  const [isCheckingClosure, setIsCheckingClosure] = useState(false) // Loading state for closure check
  
  // 过滤只显示 Manager 的浮动任务，排除 manual-closing
  const floatingTasks = allFloatingTasks.filter(task => 
    task.role === 'Manager' && task.id !== 'manual-closing'
  )
  
  
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
  
  // Function to load approved duty manager tasks and update review task completion
  const loadApprovedDutyManagerTasks = async () => {
    const restaurantId = await getRestaurantId()
    
    if (!restaurantId || !currentUserId) {
      return []
    }
    
    const approvedDutyTasks = await getTodayApprovedDutyManagerTasks(restaurantId)
    
    // Add review tasks to completedIds if their linked tasks are approved
    const reviewTasksToAdd: string[] = []
    
    // Map duty manager tasks to their review tasks dynamically
    const dutyToReviewMap: { [key: string]: string } = {}
    
    // Generate mappings for all periods that have duty manager tasks
    workflowPeriods.forEach(period => {
      const dutyTasks = period.tasks?.dutyManager || []
      dutyTasks.forEach(dutyTask => {
        dutyToReviewMap[dutyTask.id] = `review-${dutyTask.id}`
      })
    })
    
    approvedDutyTasks.forEach(dutyTaskId => {
      const reviewTaskId = dutyToReviewMap[dutyTaskId]
      if (reviewTaskId) {
        reviewTasksToAdd.push(reviewTaskId)
      }
    })
    
    
    return reviewTasksToAdd
  }

  // Load completed tasks from Supabase on mount
  useEffect(() => {
    async function loadFromDatabase() {
      try {
        // 首先刷新 DutyManagerContext 的数据库状态
        await refreshFromDatabase()
        
        // Get current user from authService instead of supabase.auth
        const currentUser = authService.getCurrentUser()
        // console.log('[ManagerDashboard] Current user from authService:', currentUser)
        if (!currentUser) {
          // console.error('[ManagerDashboard] No authenticated user from authService')
          setIsLoadingFromDb(false)
          return
        }
        
        setCurrentUserId(currentUser.id)
        // console.log('[ManagerDashboard] Set currentUserId to:', currentUser.id)
        
        // Load today's completed tasks
        const completedIds = await getTodayCompletedTaskIds(currentUser.id)
        
        // Load approved duty manager tasks to determine review task completion
        const reviewTasksToAdd = await loadApprovedDutyManagerTasks()
        
        setCompletedTaskIds([...completedIds, ...reviewTasksToAdd])
        
        // Load today's task statuses for TaskSummary
        const taskStatuses = await getTodayTaskStatuses(currentUser.id)
        setDbTaskStatuses(taskStatuses)
        
        // Check for global test time
        const globalTestTime = getCurrentTestTime()
        if (globalTestTime) {
          setTestTime(globalTestTime)
        }
        
        // Clear missing tasks on fresh load to prevent stale data
        setMissingTasks([])
        
      } catch (error) {
        // console.error('Error loading from database:', error)
      } finally {
        setIsLoadingFromDb(false)
        setHasInitialized(true)
      }
    }
    
    if (!hasInitialized) {
      loadFromDatabase()
    }
  }, [hasInitialized, refreshFromDatabase])
  
  // 移除频繁的审核状态监听，只在初始加载时从数据库获取
  
  // Listen for clear storage broadcast from other tabs - REMOVED: Using only Supabase Realtime
  
  // Period update effect - now primarily uses database state
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
          setNextPeriod(openingPeriod || null)
          return
        }
        
        // If database says we're in manual closing, respect that
        if (dbState.isManualClosing) {
          // console.log('[ManagerDashboard] Database says manual closing')
          setIsManualClosing(true)
          manualClosingRef.current = true
          // Get closing period
          const closingPeriod = workflowPeriods.find(p => p.id === 'closing')
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
          const openingPeriod = workflowPeriods.find(p => p.id === 'opening')
          setNextPeriod(openingPeriod || null)
        }
      } else {
        // No database state available yet
        // console.log('[ManagerDashboard] No database state available, waiting...')
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
  }, [testTime, isManualClosing, isWaitingForNextDay, manuallyAdvancedPeriod, currentPeriod, currentPeriodId, workflowPeriods, dbState])
  
  
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
  
  // Auto-generate review tasks based on duty manager tasks from database
  useEffect(() => {
    if (!currentPeriod) {
      setReviewTasks([])
      return
    }
    
    // Check if current period has duty manager tasks
    const dutyManagerTasks = currentPeriod.tasks?.dutyManager || []
    
    if (dutyManagerTasks.length > 0) {
      // Generate review tasks for each duty manager task
      const generatedReviewTasks = dutyManagerTasks.map(dutyTask => ({
        id: `review-${dutyTask.id}`,
        title: `审核：${dutyTask.title}`,
        description: `审核值班经理提交的${dutyTask.title}记录`,
        role: 'Manager' as const,
        department: '前厅' as const,
        uploadRequirement: '审核' as const,
        linkedTasks: [dutyTask.id],
        autoGenerated: true,
        timeSlot: currentPeriod.id,
        isNotice: false,
        startTime: currentPeriod.startTime,
        endTime: currentPeriod.endTime
      }))
      
      setReviewTasks(generatedReviewTasks)
    } else {
      setReviewTasks([])
    }
  }, [currentPeriod])
  
  // Safety check: Clear invalid states
  useEffect(() => {
    // Only run this check after initialization
    if (!hasInitialized) return
    
    // Check if isManualClosing is stuck without a valid currentPeriod
    if (isManualClosing && !currentPeriod && !isWaitingForNextDay) {
      // Clear the invalid state
      setIsManualClosing(false)
      manualClosingRef.current = false
      
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
        console.log('[ManagerDashboard] Daily reset at 10:00 AM - clearing all task states')
        
        // Removed: Clear swipe confirmation states - no longer using swipe
        
        // Reset all task-related states
        setTaskStatuses([])
        setCompletedTaskIds([])
        setNoticeComments([])
        setMissingTasks([])
        setReviewTasks([])
        
        // Always clear waiting state and manual advance state at daily reset
        setIsWaitingForNextDay(false)
        setIsManualClosing(false)
        manualClosingRef.current = false
        setManuallyAdvancedPeriod(null)
        manualAdvanceRef.current = null
        setCurrentPeriodId(null)
      }
      
      lastCheckedHour = currentHour
    }
    
    // Check immediately and then every second
    checkForDailyReset()
    const interval = setInterval(checkForDailyReset, 1000)
    
    return () => clearInterval(interval)
  }, [testTime, isWaitingForNextDay])
  
  // Missing tasks update effect - based on database
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
            period.tasks.manager.forEach((task: TaskTemplate) => {
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
        // console.error('Error updating missing tasks from database:', error)
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
    // Skip event-driven periods as they don't have fixed end times
    if (!currentPeriod || currentPeriod.isEventDriven || currentPeriod.id === 'closing') return
    
    const notifiedTasks = new Set<string>() // Track which tasks we've notified about
    
    const updateOverdueStatus = () => {
      const now = testTime || new Date()
      const [endHour, endMinute] = currentPeriod.endTime.split(':').map(Number)
      const periodEnd = new Date(now)
      periodEnd.setHours(endHour, endMinute, 0, 0)
      
      if (now > periodEnd) {
        const minutesOverdue = Math.floor((now.getTime() - periodEnd.getTime()) / 60000)
        
        setTaskStatuses(prev => {
          let changed = false
          const updated = prev.map(status => {
            if (!status.completed && !status.overdue) {
              changed = true
              
              // Find task name for notification
              const task = currentPeriod.tasks.manager.find(t => t.id === status.taskId)
              if (task && !notifiedTasks.has(task.id)) {
                notificationService.sendOverdueNotification(task.name, minutesOverdue)
                notifiedTasks.add(task.id)
              }
              
              return { ...status, overdue: true }
            }
            return status
          })
          
          // Add any tasks that don't have a status yet
          currentPeriod.tasks.manager.forEach(task => {
            if (!task.isNotice && !updated.find(s => s.taskId === task.id)) {
              changed = true
              
              // Send notification for newly overdue task
              if (!notifiedTasks.has(task.id)) {
                notificationService.sendOverdueNotification(task.name, minutesOverdue)
                notifiedTasks.add(task.id)
              }
              
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
    
    // 检查是否是审核任务
    const task = currentTasks.find(t => t.id === taskId)
    
    if (task && task.uploadRequirement === '审核' && task.linkedTasks) {
      // 处理审核通过逻辑
      // 更新被审核的值班经理任务状态为通过
      task.linkedTasks.forEach(linkedTaskId => {
        updateReviewStatus(linkedTaskId, 'approved')
      })
      
      // 审核任务不需要创建新的任务记录，直接返回
      // 只更新本地状态显示完成
      if (!task.isFloating) {
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
        setCompletedTaskIds(prev => {
          const newIds = [...prev, taskId]
          return newIds
        })
      }
      
      // 刷新任务状态
      if (currentUserId) {
        const updatedTaskStatuses = await getTodayTaskStatuses(currentUserId)
        setDbTaskStatuses(updatedTaskStatuses)
      }
      
      return // 审核任务处理完成，不继续执行后续的submitTaskWithMedia
    }
    
    // 检查是否是值班经理任务
    if (task && task.role === 'DutyManager' && data) {
      // 将值班经理任务的提交数据添加到Context
      const submission: DutyManagerSubmission = {
        taskId,
        taskTitle: task.title,
        submittedAt: now,
        content: {
          // 处理照片数据 - 注意PhotoSubmissionDialog使用的是item.image而不是item.photo
          photos: data.evidence?.map((item: any) => item.photo || item.image) || [],
          photoGroups: data.photoGroups || [],
          text: data.textInput || data.evidence?.[0]?.description || ''
        }
      }
      
      addSubmission(submission)
    }
    
    // Submit task data to Supabase with media upload FIRST
    if (currentUserId && task) {
      try {
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
          
          setCompletedTaskIds(prev => [...prev, taskId])
          
          // Refresh task statuses from database for TaskSummary
          const updatedTaskStatuses = await getTodayTaskStatuses(currentUserId)
          setDbTaskStatuses(updatedTaskStatuses)
        } else {
          // Still refresh task statuses for floating tasks
          const updatedTaskStatuses = await getTodayTaskStatuses(currentUserId)
          setDbTaskStatuses(updatedTaskStatuses)
        }
      } catch (error) {
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
      setCompletedTaskIds(prev => [...prev, taskId])
    }
  }
  
  const handleNoticeComment = async (noticeId: string, comment: string) => {
    if (!currentUserId) return
    
    // Submit to Supabase
    // TODO: submitNoticeResponse uses non-existent table - commenting out
    // const response = await submitNoticeResponse(currentUserId, noticeId, comment)
    
    // Simulate response for now
    const response = {
      task_id: noticeId,
      response_content: comment,
      created_at: new Date().toISOString()
    }
    
    if (response) {
      const newComment: NoticeComment = {
        noticeId: response.task_id,
        comment: response.response_content,
        timestamp: new Date(response.created_at || new Date().toISOString())
      }
      setNoticeComments(prev => [...prev, newComment])
    }
  }
  
  const handleLateSubmit = async (taskId: string, data?: any) => {
    
    // Submit late task data to Supabase
    if (currentUserId) {
      try {
        // Find the task details from missingTasks
        const missingTaskItem = missingTasks.find(item => item.task.id === taskId)
        const task = missingTaskItem?.task || currentTasks.find(t => t.id === taskId)
        
        // If still no task found, try to find from all periods
        let foundTask = task
        let taskPeriodId = currentPeriod?.id || ''
        if (!foundTask) {
          for (const period of workflowPeriods) {
            const periodTask = period.tasks.manager.find((t: TaskTemplate) => t.id === taskId)
            if (periodTask) {
              foundTask = periodTask
              taskPeriodId = period.id
              break
            }
          }
        }
        
        // Always get the upload requirement from database
        let uploadRequirement = null
        
        // Query the database for the task's submission_type
        const { data: dbTask } = await supabase
          .from('roleplay_tasks')
          .select('submission_type')
          .eq('id', taskId)
          .single()
        
        if (dbTask?.submission_type) {
          // Map submission_type to uploadRequirement
          const typeMap: { [key: string]: string } = {
            'photo': '拍照',
            'audio': '录音',
            'text': '记录',
            'list': '列表',
            'checkbox': '列表'
          }
          uploadRequirement = typeMap[dbTask.submission_type] || null
        }
        
        
        if (foundTask) {
          const now = testTime || new Date()
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
            periodId: taskPeriodId,
            uploadRequirement,
            data
          })
          
          
          // Update local state after successful submission
          setMissingTasks(prev => {
            const newMissingTasks = prev.filter(item => item.task.id !== taskId)
            return newMissingTasks
          })
          
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
          
          setCompletedTaskIds(prev => {
            const newIds = [...prev, taskId]
            return newIds
          })
          
          // Refresh task statuses from database for TaskSummary
          const updatedTaskStatuses = await getTodayTaskStatuses(currentUserId)
          setDbTaskStatuses(updatedTaskStatuses)
          
          // Force refresh of missing tasks from the database
          if (true) { // Always use database mode
            const completedIds = await getTodayCompletedTaskIds(currentUserId)
            const updatedMissingTasks: { task: TaskTemplate; periodName: string }[] = []
            
            // Check all periods that have passed
            workflowPeriods.forEach(period => {
              // Skip event-driven periods as they don't end by time
              if (period.isEventDriven) return
              
              // Special handling for closing period (cross-day period)
              if (period.id === 'closing') {
                const currentHour = now.getHours()
                const currentMinutes = now.getMinutes()
                const currentTimeInMinutes = currentHour * 60 + currentMinutes
                
                // If we're between 00:00-21:29 (before today's closing starts),
                // skip checking the closing period entirely
                if (currentTimeInMinutes < 21 * 60 + 30) {
                  return
                }
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
              if (now > periodEnd && period.id !== currentPeriod?.id) {
                period.tasks.manager.forEach((task: TaskTemplate) => {
                  if (task.isNotice) return // Skip notices
                  
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
          }
        }
      } catch (error) {
        console.error('[ManagerDashboard] Error submitting late task to Supabase:', error)
        // If submission fails, throw error to be caught by TaskSummary
        throw error // Re-throw to be caught by TaskSummary
      }
    }
  }
  
  const handleBack = () => {
    localStorage.removeItem('selectedRole')
    navigate('/role-selection')
  }
  
  
  // Removed: handleLastCustomerLeftLunch - duty tasks now auto-assigned at proper times

  // Removed: handleLastCustomerLeft - duty tasks now auto-assigned at proper times
  
  const handleReviewReject = (taskId: string, reason: string) => {
    // console.log(`handleReviewReject called for review task ${taskId} with reason: ${reason}`)
    
    // 找到审核任务对应的linkedTasks（值班经理任务）
    const reviewTask = currentTasks.find(t => t.id === taskId)
    if (!reviewTask || !reviewTask.linkedTasks || reviewTask.linkedTasks.length === 0) {
      // console.error('Review task not found or has no linked tasks')
      return
    }
    
    // 更新被审核的值班经理任务状态为驳回（不是审核任务本身！）
    reviewTask.linkedTasks.forEach(linkedTaskId => {
      // console.log(`Updating linked task ${linkedTaskId} status to rejected`)
      updateReviewStatus(linkedTaskId, 'rejected', reason)
    })
    
    // 审核任务本身回到未完成状态（从completedTaskIds中移除）
    // console.log('Before removing review task from completedTaskIds:', completedTaskIds)
    setCompletedTaskIds(prev => {
      const newIds = prev.filter(id => id !== taskId)
      // console.log('After removing review task from completedTaskIds:', newIds)
      return newIds
    })
    
    // 清除审核任务的taskStatus
    setTaskStatuses(prev => {
      const newStatuses = prev.filter(status => status.taskId !== taskId)
      // console.log('Cleared task status for review task:', taskId)
      return newStatuses
    })
    
    // 值班经理可以通过Context看到驳回状态并重新提交
    // console.log('Review rejection completed')
  }
  
  const handleClosingComplete = async () => {
    
    setIsCheckingClosure(true)
    
    try {
      // 移除了对floating tasks的检查，因为它们不是强制性的
      
      // Always check database state to see if we can close
      const restaurantId = getRestaurantId()
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
    
    // Submit manual closing task to database
    // restaurantId already declared above
    if (restaurantId && currentUserId) {
      const success = await restaurantStateService.submitManualClosing(
        restaurantId,
        currentUserId,
        '今日营业结束，手动闭店'
      )
      
      if (!success) {
        alert('闭店操作失败，请重试。')
        return
      }
      
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
    // Use React's batching to ensure all states update together
    React.startTransition(() => {
      setTaskStatuses([])
      setCompletedTaskIds([])
      setNoticeComments([])
      setMissingTasks([])
      setReviewTasks([])
      setIsManualClosing(false)
      manualClosingRef.current = false // Clear ref too
      // Clear manual advance state to prevent conflicts
      setManuallyAdvancedPeriod(null)
      manualAdvanceRef.current = null
      setCurrentPeriodId(null) // Clear current period ID
      setIsWaitingForNextDay(true) // Set waiting state BEFORE clearing period
      setCurrentPeriod(null) // Clear current period - should show waiting display
      
      // Set next period to tomorrow's opening
      const openingPeriod = workflowPeriods.find(p => p.id === 'opening')
      if (openingPeriod) {
        setNextPeriod(openingPeriod)
      }
    })
    } catch (error) {
      console.error('[ManagerDashboard] Error during closure check:', error)
      alert('检查闭店条件时出错，请重试。')
    } finally {
      setIsCheckingClosure(false)
    }
  }
  
  const handleAdvancePeriod = () => {
    if (!currentPeriod) return
    
    // Find the next period in sequence
    const currentIndex = workflowPeriods.findIndex(p => p.id === currentPeriod.id)
    if (currentIndex === -1 || currentIndex >= workflowPeriods.length - 1) return
    
    const nextPeriod = workflowPeriods[currentIndex + 1]
    
    // Special handling for transitioning to closing (previously was pre-closing)
    if (nextPeriod.id === 'closing') {
      // Closing should only be entered when dinner service ends naturally
      // or through manual advance (representing early end of service)
    }
    
    // Collect uncompleted tasks from current period
    const uncompletedTasks: { task: TaskTemplate; periodName: string }[] = []
    currentPeriod.tasks.manager.forEach(task => {
      if (!task.isNotice && !completedTaskIds.includes(task.id)) {
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
    setNextPeriod(getNextPeriodFromDatabase(workflowPeriods, testTime))
  }

  // 添加重置任务功能（用于测试）
  const handleResetTasks = useCallback(() => {
    // 清空所有任务相关状态
    setTaskStatuses([])
    setCompletedTaskIds([])
    setNoticeComments([])
    setMissingTasks([])
    setReviewTasks([])
    setIsManualClosing(false)
    setManuallyAdvancedPeriod(null)
    manualAdvanceRef.current = null
    setIsWaitingForNextDay(false)
    waitingRef.current = false
    setCurrentPeriodId(null)
    // setLunchSwipeCompleted(false) // Removed - variable not defined
    
    // 清除Context中的值班经理数据
    clearTrigger()
    
    // 保持当前时段不变，但重新初始化
    const now = testTime || new Date()
    const newPeriod = getCurrentPeriodFromDatabase(workflowPeriods, now)
    setCurrentPeriod(newPeriod)
    setNextPeriod(getNextPeriodFromDatabase(workflowPeriods, now))
  }, [testTime, clearTrigger])
  
  // Always append floating tasks at the end
  // Include review tasks for duty manager tasks in closing period
  let baseTasks = currentPeriod?.tasks?.manager || []
  if (currentPeriod?.id === 'closing') {
    baseTasks = [...baseTasks, ...reviewTasks]
  }
  const currentTasks = [...baseTasks, ...floatingTasks]
  
  // Separate regular tasks and notices
  const regularTasks = currentTasks.filter(t => !t.isNotice)
  const notices = currentTasks.filter(t => t.isNotice)
  const isServicePeriod = currentPeriod?.id === 'lunch-service' || currentPeriod?.id === 'dinner-service'
  
  
  const shouldShowClosedDisplay = !currentPeriod || isWaitingForNextDay
  
  // 处理加载状态
  if (isLoading || isLoadingFromDb) {
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
                  tasks={regularTasks}
                  completedTaskIds={completedTaskIds}
                  noticeComments={noticeComments}
                  testTime={testTime}
                  onComplete={handleTaskComplete}
                  onComment={handleNoticeComment}
                  // Removed: onLastCustomerLeftLunch - duty tasks auto-assigned
                  onAdvancePeriod={handleAdvancePeriod}
                  onReviewReject={handleReviewReject}
                  reviewStatus={reviewStatus}
                  renderNotices={() => 
                    notices.length > 0 ? (
                      <NoticeContainer
                        notices={notices}
                        noticeComments={noticeComments}
                        onComment={handleNoticeComment}
                        isServicePeriod={isServicePeriod}
                      />
                    ) : null
                  }
                />
                
                {/* Show manual closing button in closing period */}
                {currentPeriod.id === 'closing' && (
                  <Paper elevation={2} sx={{ p: 3, mt: 3, textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom sx={{ color: 'success.main' }}>
                      今日营业即将结束
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      点击下方按钮进行闭店操作
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
                        '确认闭店'
                      )}
                    </Button>
                  </Paper>
                )}
              </>
            ) : (
              <ClosedPeriodDisplay 
                nextPeriod={nextPeriod} 
                testTime={testTime} 
                currentStatus={isWaitingForNextDay ? '休息中' : undefined} 
              />
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
                dbTaskStatuses={dbTaskStatuses}
                useDatabase={true}
              />
            </Grid>
          )}
        </Grid>
      </Container>
    </>
  )
}
