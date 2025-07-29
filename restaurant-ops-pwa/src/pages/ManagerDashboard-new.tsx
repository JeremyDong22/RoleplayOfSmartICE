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
  Button
} from '@mui/material'
import Grid from '@mui/material/Grid'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
// Status Island removed as requested
import { TaskCountdown } from '../components/TaskCountdown/TaskCountdown'
import { TaskSummary } from '../components/TaskSummary'
import { EditableTime } from '../components/TimeControl/EditableTime'
import { ClosedPeriodDisplay } from '../components/ClosedPeriodDisplay/ClosedPeriodDisplay'
import { FloatingTaskCard } from '../components/FloatingTaskCard'
import { getCurrentPeriod, getNextPeriod } from '../utils/workflowParser'
import type { WorkflowPeriod, TaskTemplate } from '../utils/workflowParser'
import { useTaskData } from '../contexts/TaskDataContext'
import { saveState, loadState, clearState } from '../utils/persistenceManager'
import { useDutyManager, type DutyManagerSubmission } from '../contexts/DutyManagerContext'
// import { broadcastService } from '../services/broadcastService' // Removed: Using only Supabase Realtime
import { getCurrentTestTime } from '../utils/globalTestTime'
import { clearAllAppStorage } from '../utils/clearAllStorage'
import notificationService from '../services/notificationService'
import { getTodayCompletedTaskIds, getCompletedTasksInRange } from '../services/taskRecordService'
import { submitTaskWithMedia } from '../utils/taskSubmissionHelper'
import { supabase } from '../services/supabase'

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

export const ManagerDashboard: React.FC = () => {
  // Check if role is correct
  const selectedRole = localStorage.getItem('selectedRole')
  
  const navigate = useNavigate()
  const { setTrigger, submissions, updateReviewStatus, reviewStatus, clearTrigger, addSubmission } = useDutyManager()
  
  // 从数据库获取任务数据
  const { workflowPeriods, floatingTasks: allFloatingTasks, isLoading, error } = useTaskData()
  
  // 监听值班经理的提交状态变化，实时更新UI
  useEffect(() => {
    // 当submissions变化时，触发组件重新渲染
    // submissions 是从 DutyManagerContext 中获取的，会通过实时服务自动更新
    console.log('[ManagerDashboard] Duty manager submissions updated:', submissions)
  }, [submissions])
  
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
  const [hasInitialized, setHasInitialized] = useState(false) // Track if we've loaded from localStorage
  const [manuallyAdvancedPeriod, setManuallyAdvancedPeriod] = useState<string | null>(null) // Track manually advanced period ID
  const manualAdvanceRef = useRef<string | null>(null) // Ref for immediate access
  const [preClosingTasks, setPreClosingTasks] = useState<TaskTemplate[]>([]) // Store pre-closing tasks when transitioning to closing
  const [reviewTasks, setReviewTasks] = useState<TaskTemplate[]>([]) // Store review tasks for duty manager
  const [isLoadingFromDb, setIsLoadingFromDb] = useState(true) // Loading state for database
  const [currentUserId, setCurrentUserId] = useState<string | null>(null) // Current user ID
  const [currentPeriodId, setCurrentPeriodId] = useState<string | null>(null) // Track current period ID for persistence
  // 过滤只显示 Manager 的浮动任务
  const floatingTasks = allFloatingTasks.filter(task => task.role === 'Manager')
  
  
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
        
        // For now, still load some state from localStorage (will be removed later)
        const savedState = loadState('manager')
        if (savedState) {
          setNoticeComments(savedState.noticeComments)
          setIsManualClosing(savedState.isManualClosing)
          setIsWaitingForNextDay(savedState.isWaitingForNextDay)
          manualClosingRef.current = savedState.isManualClosing
          setManuallyAdvancedPeriod(savedState.manuallyAdvancedPeriod || null)
          manualAdvanceRef.current = savedState.manuallyAdvancedPeriod || null
          setPreClosingTasks(savedState.preClosingTasks || [])
          setCurrentPeriodId(savedState.currentPeriodId || null)
          
          if (savedState.testTime) {
            setTestTime(new Date(savedState.testTime))
          }
          
          // If we're in manual closing mode with a saved period ID, restore that period
          if (savedState.isManualClosing && savedState.currentPeriodId) {
            const savedPeriod = workflowPeriods.find(p => p.id === savedState.currentPeriodId)
            if (savedPeriod) {
              setCurrentPeriod(savedPeriod)
            }
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
  
  // Save state to localStorage (only non-task completion data)
  useEffect(() => {
    if (hasInitialized) {
      saveState('manager', {
        completedTaskIds: [], // No longer save completed tasks to localStorage
        taskStatuses: [], // No longer save task statuses to localStorage
        noticeComments,
        missingTasks: [], // No longer save missing tasks to localStorage
        isManualClosing,
        isWaitingForNextDay,
        manuallyAdvancedPeriod,
        currentPeriodId: currentPeriod?.id || null,
        preClosingTasks,
        testTime: testTime?.toISOString() || null
      })
    }
  }, [noticeComments, isManualClosing, isWaitingForNextDay, manuallyAdvancedPeriod, currentPeriod?.id, preClosingTasks, testTime, hasInitialized])
  
  // Period update effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null
    let lastPeriodId = currentPeriod?.id // Track last period to detect changes
    
    const updatePeriods = () => {
      // Skip all updates if we're in manual closing mode (check ref for immediate value)
      if (manualClosingRef.current || isManualClosing) {
        // However, if we don't have a current period yet and we're in manual closing,
        // we need to restore the saved period
        if (!currentPeriod && currentPeriodId && workflowPeriods.length > 0) {
          const savedPeriod = workflowPeriods.find(p => p.id === currentPeriodId)
          if (savedPeriod) {
            // For closing period, we need to add review tasks
            if (savedPeriod.id === 'closing' && preClosingTasks.length > 0) {
              // Recreate the review tasks
              const reviewTask1: TaskTemplate = {
                id: 'review-closing-duty-energy',
                title: '审核：能源安全检查',
                description: '审核值班经理提交的设备关闭、燃气阀门和总电源检查记录',
                role: 'Manager',
                department: '前厅',
                uploadRequirement: '审核',
                linkedTasks: ['closing-duty-manager-1'],
                autoGenerated: true,
                timeSlot: 'closing',
                isNotice: false,
                startTime: '22:30',
                endTime: '08:00'
              }
              
              const reviewTask2: TaskTemplate = {
                id: 'review-closing-duty-security',
                title: '审核：安防闭店检查',
                description: '审核值班经理提交的门窗锁闭、监控系统和报警系统设置记录',
                role: 'Manager',
                department: '前厅',
                uploadRequirement: '审核',
                linkedTasks: ['closing-duty-manager-2'],
                autoGenerated: true,
                timeSlot: 'closing',
                isNotice: false,
                startTime: '22:30',
                endTime: '08:00'
              }
              
              const reviewTask3: TaskTemplate = {
                id: 'review-closing-duty-data',
                title: '审核：营业数据记录',
                description: '审核值班经理提交的交班单和日营业报表数据',
                role: 'Manager',
                department: '前厅',
                uploadRequirement: '审核',
                linkedTasks: ['closing-duty-manager-3'],
                autoGenerated: true,
                timeSlot: 'closing',
                isNotice: false,
                startTime: '22:30',
                endTime: '08:00'
              }
              
              const closingPeriodWithReviews: WorkflowPeriod = {
                ...savedPeriod,
                displayName: savedPeriod.displayName || '闭店',
                tasks: {
                  ...savedPeriod.tasks,
                  manager: [...savedPeriod.tasks.manager, reviewTask1, reviewTask2, reviewTask3]
                }
              }
              
              setCurrentPeriod(closingPeriodWithReviews)
            } else {
              setCurrentPeriod(savedPeriod)
            }
            setNextPeriod(null) // No next period during manual closing
          }
        }
        return
      }
      
      const current = getCurrentPeriod(testTime)
      const next = getNextPeriod(testTime)
      
      // IMPORTANT: Check waiting state FIRST before manual advance
      // If we're in waiting state, only exit if we've reached opening time
      if (isWaitingForNextDay) {
        if (current && current.id === 'opening') {
          setIsWaitingForNextDay(false)
          setIsManualClosing(false)
          manualClosingRef.current = false
          // Clear any lingering manual advance state
          setManuallyAdvancedPeriod(null)
          manualAdvanceRef.current = null
          setCurrentPeriod(current)
          setNextPeriod(next)
          
          // Send notification for new period
          if (lastPeriodId !== current.id) {
            const taskCount = current.tasks.manager.filter(t => !t.isNotice).length
            notificationService.sendPeriodStartNotification(current.displayName, taskCount)
            lastPeriodId = current.id
          }
        } else {
          // Update periods even in waiting state to reflect time changes
          setCurrentPeriod(current)
          setNextPeriod(next)
        }
        // Still waiting, don't update state flags
        return
      }
      
      // Check if we have a manually advanced period
      if (manualAdvanceRef.current || manuallyAdvancedPeriod) {
        // Check if actual time has caught up to the manually advanced period
        if (current?.id === manualAdvanceRef.current || current?.id === manuallyAdvancedPeriod) {
          setManuallyAdvancedPeriod(null)
          manualAdvanceRef.current = null
        } else {
          return // Don't update periods while manually advanced
        }
      }
      
      // Normal automatic period updates
      setCurrentPeriod(current)
      setNextPeriod(next)
      
      // Send notification if period changed
      if (current && lastPeriodId !== current.id) {
        const taskCount = current.tasks.manager.filter(t => !t.isNotice).length
        notificationService.sendPeriodStartNotification(current.displayName, taskCount)
        lastPeriodId = current.id
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
  }, [testTime, isManualClosing, isWaitingForNextDay, manuallyAdvancedPeriod, currentPeriod, currentPeriodId, workflowPeriods, preClosingTasks])
  
  
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
  
  // Auto-add review tasks when entering closing period at 22:00
  useEffect(() => {
    // Check if we just entered closing period naturally (at 22:00)
    if (currentPeriod?.id === 'closing' && !isManualClosing && !manuallyAdvancedPeriod) {
      // Load pre-closing tasks if not already loaded
      if (preClosingTasks.length === 0) {
        const preClosingPeriod = workflowPeriods.find(p => p.id === 'pre-closing')
        if (preClosingPeriod) {
          setPreClosingTasks(preClosingPeriod.tasks.manager)
        }
      }
      
      // Check if review tasks are already added
      const hasReviewTasks = currentPeriod.tasks.manager.some(t => t.id.startsWith('review-closing-duty'))
      
      if (!hasReviewTasks) {
        // Create review tasks for all duty manager tasks
        const reviewTask1: TaskTemplate = {
          id: 'review-closing-duty-energy',
          title: '审核：能源安全检查',
          description: '审核值班经理提交的设备关闭、燃气阀门和总电源检查记录',
          role: 'Manager',
          department: '前厅',
          uploadRequirement: '审核',
          linkedTasks: ['closing-duty-manager-1'],
          autoGenerated: true,
          timeSlot: 'closing',
          isNotice: false,
          startTime: '22:00',
          endTime: '23:30'
        }
        
        const reviewTask2: TaskTemplate = {
          id: 'review-closing-duty-security',
          title: '审核：安防闭店检查',
          description: '审核值班经理提交的门窗锁闭、监控系统和报警系统设置记录',
          role: 'Manager',
          department: '前厅',
          uploadRequirement: '审核',
          linkedTasks: ['closing-duty-manager-2'],
          autoGenerated: true,
          timeSlot: 'closing',
          isNotice: false,
          startTime: '22:00',
          endTime: '23:30'
        }
        
        const reviewTask3: TaskTemplate = {
          id: 'review-closing-duty-data',
          title: '审核：营业数据记录',
          description: '审核值班经理提交的交班单和日营业报表数据',
          role: 'Manager',
          department: '前墅',
          uploadRequirement: '审核',
          linkedTasks: ['closing-duty-manager-3'],
          autoGenerated: true,
          timeSlot: 'closing',
          isNotice: false,
          startTime: '22:00',
          endTime: '23:30'
        }
        
        // Store review tasks in a separate state
        setReviewTasks([reviewTask1, reviewTask2, reviewTask3])
      }
    }
  }, [currentPeriod?.id, isManualClosing, manuallyAdvancedPeriod])
  
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
        // Clear localStorage
        clearState('manager')
        
        // Clear swipe confirmation states
        localStorage.removeItem('lunch-closing-confirmed')
        localStorage.removeItem('pre-closing-confirmed')
        
        // Reset all task-related states
        setTaskStatuses([])
        setCompletedTaskIds([])
        setNoticeComments([])
        setMissingTasks([])
        setPreClosingTasks([])
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
    if (isManualClosing || currentPeriod.id === 'closing' || manuallyAdvancedPeriod) {
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
          const [periodEndHour, periodEndMinute] = period.endTime.split(':').map(Number)
          const periodEnd = new Date(now)
          periodEnd.setHours(periodEndHour, periodEndMinute, 0, 0)
          
          // If this period has ended and it's not the current period
          // Skip event-driven periods (pre-closing, closing) as they don't end by time
          if (now > periodEnd && period.id !== currentPeriod.id && !period.isEventDriven) {
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
        
        // Always set missing tasks based on database for today only
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
    // Skip event-driven periods (pre-closing, closing) as they don't have fixed end times
    if (!currentPeriod || currentPeriod.isEventDriven || currentPeriod.id === 'pre-closing' || currentPeriod.id === 'closing') return
    
    let notifiedTasks = new Set<string>() // Track which tasks we've notified about
    
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
      // console.log(`Approving review task ${taskId}, updating linked tasks:`, task.linkedTasks)
      
      // 更新被审核的值班经理任务状态为通过
      task.linkedTasks.forEach(linkedTaskId => {
        // console.log(`Updating linked task ${linkedTaskId} status to approved`)
        updateReviewStatus(linkedTaskId, 'approved')
      })
    }
    
    // 检查是否是值班经理任务
    if (task && task.role === 'DutyManager' && data) {
      // console.log('[ManagerDashboard] Processing DutyManager task submission:', {
      //   taskId,
      //   taskTitle: task.title,
      //   data
      // })
      
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
      
      // console.log('[ManagerDashboard] Adding submission to DutyManagerContext:', submission)
      addSubmission(submission)
    }
    
    // 更新任务状态
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
    
    // Submit task data to Supabase with media upload
    if (currentUserId && task) {
      try {
        const result = await submitTaskWithMedia({
          taskId,
          userId: currentUserId,
          restaurantId: 1, // 野百灵的ID是1
          date: now.toISOString().split('T')[0],
          periodId: currentPeriod?.id || '',
          uploadRequirement: task.uploadRequirement,
          data
        })
        
        console.log('[ManagerDashboard] Task successfully submitted:', result.id)
      } catch (error) {
        console.error('[ManagerDashboard] Error submitting task to Supabase:', {
          error,
          taskId,
          userId: currentUserId,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        })
        // Still update local state even if submission fails
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
  
  const handleLateSubmit = async (taskId: string, data?: any) => {
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
    
    // Submit late task data to Supabase
    if (data && currentUserId) {
      try {
        // Find the task details
        const task = currentTasks.find(t => t.id === taskId) || 
                    missingTasks.find(item => item.task.id === taskId)?.task
        
        if (task) {
          const result = await submitTaskWithMedia({
            taskId,
            userId: currentUserId,
            restaurantId: 1, // 野百灵的ID是1
            date: now.toISOString().split('T')[0],
            periodId: currentPeriod?.id || '',
            uploadRequirement: task.uploadRequirement,
            data
          })
          
          console.log('Late task submitted to Supabase:', result.id)
        }
      } catch (error) {
        console.error('Error submitting late task to Supabase:', error)
      }
    }
  }
  
  const handleBack = () => {
    localStorage.removeItem('selectedRole')
    navigate('/role-selection')
  }
  
  
  const handleLastCustomerLeftLunch = async () => {
    // Save confirmation state to localStorage
    localStorage.setItem('lunch-closing-confirmed', 'true')
    
    // Send broadcast message - REMOVED: Now using only Supabase Realtime
    // broadcastService.send('LAST_CUSTOMER_LEFT_LUNCH', {
    //   period: currentPeriod?.id,
    //   timestamp: Date.now()
    // }, 'manager')
    
    // 使用Context设置触发状态
    await setTrigger({
      type: 'last-customer-left-lunch',
      triggeredAt: new Date(),
      triggeredBy: 'manager-001' // 在实际应用中应该是真实的管理员ID
    })
    
    // 创建两个审核任务
    const reviewTask1: TaskTemplate = {
      id: 'review-lunch-duty-energy',
      title: '审核：能源管理',
      description: '审核值班经理提交的空调和照明系统检查记录',
      role: 'Manager',
      department: '前厅',
      uploadRequirement: '审核',
      linkedTasks: ['lunch-duty-manager-1'],
      autoGenerated: true,
      timeSlot: 'lunch-closing',
      isNotice: false,
      startTime: '14:00',
      endTime: '14:30'
    }
    
    const reviewTask2: TaskTemplate = {
      id: 'review-lunch-duty-revenue',
      title: '审核：营业款核对',
      description: '审核值班经理提交的午市营业额和收款记录',
      role: 'Manager',
      department: '前厅',
      uploadRequirement: '审核',
      linkedTasks: ['lunch-duty-manager-2'],
      autoGenerated: true,
      timeSlot: 'lunch-closing',
      isNotice: false,
      startTime: '14:00',
      endTime: '14:30'
    }
    
    // 将审核任务添加到当前任务列表
    if (currentPeriod) {
      const updatedPeriod: WorkflowPeriod = {
        ...currentPeriod,
        tasks: {
          ...currentPeriod.tasks,
          manager: [...currentPeriod.tasks.manager, reviewTask1, reviewTask2]
        }
      }
      setCurrentPeriod(updatedPeriod)
    }
  }

  const handleLastCustomerLeft = async () => {
    // Save confirmation state to localStorage
    localStorage.setItem('pre-closing-confirmed', 'true')
    
    // Send broadcast message - REMOVED: Now using only Supabase Realtime
    // broadcastService.send('LAST_CUSTOMER_LEFT_DINNER', {
    //   period: currentPeriod?.id,
    //   timestamp: Date.now()
    // }, 'manager')
    
    // 使用Context设置触发状态
    await setTrigger({
      type: 'last-customer-left-dinner',
      triggeredAt: new Date(),
      triggeredBy: 'manager-001' // 在实际应用中应该是真实的管理员ID
    })
    
    // Force transition to closing period
    const closingPeriod = workflowPeriods.find(p => p.id === 'closing')
    
    if (closingPeriod) {
      // Store pre-closing tasks to display them along with closing tasks
      if (currentPeriod?.id === 'pre-closing') {
        setPreClosingTasks(currentPeriod.tasks.manager)
      }
      
      // 创建两个审核任务
      const reviewTask1: TaskTemplate = {
        id: 'review-closing-duty-energy',
        title: '审核：能源安全检查',
        description: '审核值班经理提交的设备关闭、燃气阀门和总电源检查记录',
        role: 'Manager',
        department: '前厅',
        uploadRequirement: '审核',
        linkedTasks: ['closing-duty-manager-1'],
        autoGenerated: true,
        timeSlot: 'closing',
        isNotice: false,
        startTime: '00:00',
        endTime: '01:00'
      }
      
      const reviewTask2: TaskTemplate = {
        id: 'review-closing-duty-security',
        title: '审核：安防闭店检查',
        description: '审核值班经理提交的门窗锁闭、监控系统和报警系统设置记录',
        role: 'Manager',
        department: '前厅',
        uploadRequirement: '审核',
        linkedTasks: ['closing-duty-manager-2'],
        autoGenerated: true,
        timeSlot: 'closing',
        isNotice: false,
        startTime: '00:00',
        endTime: '01:00'
      }
      
      const reviewTask3: TaskTemplate = {
        id: 'review-closing-duty-data',
        title: '审核：营业数据记录',
        description: '审核值班经理提交的交班单和日营业报表数据',
        role: 'Manager',
        department: '前厅',
        uploadRequirement: '审核',
        linkedTasks: ['closing-duty-manager-3'],
        autoGenerated: true,
        timeSlot: 'closing',
        isNotice: false,
        startTime: '00:00',
        endTime: '01:00'
      }
      
      // 将审核任务添加到closing period
      const closingPeriodWithReviews: WorkflowPeriod = {
        ...closingPeriod,
        displayName: closingPeriod.displayName || '闭店', // 确保displayName存在
        tasks: {
          ...closingPeriod.tasks,
          manager: [...closingPeriod.tasks.manager, reviewTask1, reviewTask2, reviewTask3]
        }
      }
      
      // Only add missing tasks from periods BEFORE pre-closing
      // Pre-closing tasks will remain visible in the current task view
      const allMissingTasks: { task: TaskTemplate; periodName: string }[] = []
      
      // Add existing missing tasks (from periods before pre-closing)
      allMissingTasks.push(...missingTasks)
      
      // Set ref immediately to prevent race conditions
      manualClosingRef.current = true
      
      // Use React's batching to ensure all state updates happen together
      // This prevents the period update effect from running between state updates
      React.startTransition(() => {
        // Set manual closing flag FIRST
        setIsManualClosing(true)
        
        // Then update all other states
        setCurrentPeriod(closingPeriodWithReviews)
        setNextPeriod(null) // No next period during closing
        
        // Set all missing tasks (excluding pre-closing tasks)
        setMissingTasks(allMissingTasks)
        
        // Don't clear completed tasks - they track ALL periods
        
        // Clear any existing task statuses for a fresh start
        setTaskStatuses([])
      })
      
    }
  }
  
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
  
  const handleClosingComplete = () => {
    // Check floating tasks first
    const incompleteFloatingTasks = floatingTasks.filter(task => !completedTaskIds.includes(task.id))
    if (incompleteFloatingTasks.length > 0) {
      alert(`请先完成特殊任务：${incompleteFloatingTasks.map(t => t.title).join('、')}`)
      return
    }
    
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
      setPreClosingTasks([])
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
    
  }
  
  const handleAdvancePeriod = () => {
    if (!currentPeriod) return
    
    // Find the next period in sequence
    const currentIndex = workflowPeriods.findIndex(p => p.id === currentPeriod.id)
    if (currentIndex === -1 || currentIndex >= workflowPeriods.length - 1) return
    
    const nextPeriod = workflowPeriods[currentIndex + 1]
    
    // Special handling for transitioning to pre-closing (event-driven period)
    if (nextPeriod.id === 'pre-closing') {
      // Pre-closing should only be entered when dinner service ends naturally
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
    setNextPeriod(getNextPeriod(testTime))
  }

  // 添加重置任务功能（用于测试）
  const handleResetTasks = useCallback(() => {
    // 清空所有任务相关状态
    setTaskStatuses([])
    setCompletedTaskIds([])
    setNoticeComments([])
    setMissingTasks([])
    setPreClosingTasks([])
    setReviewTasks([])
    setIsManualClosing(false)
    setManuallyAdvancedPeriod(null)
    manualAdvanceRef.current = null
    setIsWaitingForNextDay(false)
    waitingRef.current = false
    setCurrentPeriodId(null)
    // setLunchSwipeCompleted(false) // Removed - variable not defined
    
    // 清除本地存储
    clearState('manager')
    
    // 清除值班经理相关的存储
    localStorage.removeItem('dutyManagerTrigger')
    localStorage.removeItem('dutyManagerSubmissions')
    localStorage.removeItem('dutyManagerReviewStatus')
    
    // 清除Context中的值班经理数据
    clearTrigger()
    
    // 保持当前时段不变，但重新初始化
    const now = testTime || new Date()
    const newPeriod = getCurrentPeriod(now)
    setCurrentPeriod(newPeriod)
    setNextPeriod(getNextPeriod(now))
  }, [testTime, clearTrigger])
  
  // When in closing period, concatenate pre-closing tasks with closing tasks and review tasks
  // Always append floating tasks at the end
  let baseTasks = currentPeriod?.tasks?.manager || []
  
  if (currentPeriod?.id === 'closing') {
    // In closing period, include pre-closing tasks and review tasks
    baseTasks = [...preClosingTasks, ...baseTasks, ...reviewTasks]
  }
  
  const currentTasks = [...baseTasks, ...floatingTasks]
  
  
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
              <TaskCountdown
                period={currentPeriod}
                tasks={currentTasks}
                completedTaskIds={completedTaskIds}
                noticeComments={noticeComments}
                testTime={testTime}
                onComplete={handleTaskComplete}
                onComment={handleNoticeComment}
                onLastCustomerLeftLunch={handleLastCustomerLeftLunch}
                onClosingComplete={handleClosingComplete}
                onAdvancePeriod={handleAdvancePeriod}
                onReviewReject={handleReviewReject}
                reviewStatus={reviewStatus}
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