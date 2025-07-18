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
  Button
} from '@mui/material'
import Grid from '@mui/material/Grid'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
// Status Island removed as requested
import { TaskCountdown } from '../components/TaskCountdown/TaskCountdown'
import { TaskSummary } from '../components/TaskSummary/TaskSummary'
import { EditableTime } from '../components/TimeControl/EditableTime'
import { ClosedPeriodDisplay } from '../components/ClosedPeriodDisplay/ClosedPeriodDisplay'
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
### 前厅
1. 收市准备：先收市再休息，提前安排人员进行卫生清扫、原材料半成品收纳保存、物资物品收纳等工作
2. 值班安排：安排值班人员
3. 用餐安排：其他人员陆续进行晚餐就餐
### 后厨
1. 食材下单：检查当日库存情况，制定第二天的食材用量
2. 收市准备：先收市再休息，提前安排人员进行卫生清扫、原材料半成品收纳保存、物资物品收纳等工作
3. 值班安排：安排值班人员
4. 用餐安排：其他人员陆续进行晚餐就餐

## 闭店（最后一桌客人离店后）
1. 收据清点保管：清点当日收据并存放至指定位置保管
2. 营业数据记录：打印交班单并填写日营业报表数据
3. 现金清点保管：清点现金保存至指定位置
4. 当日复盘总结：门店管理层进行5分钟左右当日问题复盘与总结为第二天晨会做准备
5. 能源安全检查：关闭并检查门店水电气能源，确保门店能源安全
6. 安防闭店检查：锁好抽屉、门窗进行闭店上报，确保无明火，安防系统开启`

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
  console.log('[ChefDashboard] Component render start')
  
  // Check if role is correct
  const selectedRole = localStorage.getItem('selectedRole')
  console.log('[ChefDashboard] Selected role from localStorage:', selectedRole)
  
  const navigate = useNavigate()
  
  // Redirect to role selection if no role is selected
  useEffect(() => {
    if (!selectedRole) {
      console.log('[ChefDashboard] No role selected, redirecting to role selection')
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
    
    console.log('[ChefDashboard] About to load workflow periods')
    const workflowPeriods = loadWorkflowPeriods()
    console.log('[ChefDashboard] Workflow periods loaded:', workflowPeriods)
  
  // Load state from localStorage on mount
  useEffect(() => {
    console.log('[ChefDashboard] localStorage effect - hasInitialized:', hasInitialized)
    if (!hasInitialized) {
      const savedState = loadState('chef')
      console.log('[ChefDashboard] Saved state from localStorage:', savedState)
      if (savedState) {
        console.log('[DEBUG Persistence] Loading saved state from localStorage:', {
          isManualClosing: savedState.isManualClosing,
          isWaitingForNextDay: savedState.isWaitingForNextDay,
          manuallyAdvancedPeriod: savedState.manuallyAdvancedPeriod,
          completedTaskIds: savedState.completedTaskIds?.length || 0,
          taskStatuses: savedState.taskStatuses?.length || 0,
          missingTasks: savedState.missingTasks?.length || 0,
          testTime: savedState.testTime
        })
        
        // Check for invalid stuck state BEFORE applying it
        if (savedState.isManualClosing && !savedState.isWaitingForNextDay) {
          console.log('[DEBUG Persistence] RECOVERY - Found stuck isManualClosing=true without waiting state')
          console.log('[DEBUG Persistence] Clearing isManualClosing to recover from stuck state')
          savedState.isManualClosing = false
        }
        
        setCompletedTaskIds(savedState.completedTaskIds)
        setTaskStatuses(savedState.taskStatuses)
        setNoticeComments(savedState.noticeComments)
        setMissingTasks(savedState.missingTasks)
        setIsManualClosing(savedState.isManualClosing)
        setIsWaitingForNextDay(savedState.isWaitingForNextDay)
        waitingRef.current = savedState.isWaitingForNextDay
        setManuallyAdvancedPeriod(savedState.manuallyAdvancedPeriod || null)
        manualAdvanceRef.current = savedState.manuallyAdvancedPeriod || null
        // Restore testTime if saved
        if (savedState.testTime) {
          setTestTime(new Date(savedState.testTime))
        }
      } else {
        console.log('[DEBUG Persistence] No saved state found in localStorage')
      }
      setHasInitialized(true)
    }
  }, [hasInitialized])
  
  // Save state to localStorage whenever key states change
  useEffect(() => {
    if (hasInitialized) {
      console.log('[Persistence] Saving state to localStorage')
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
  
  // Helper function to get next period for Chef (only special case for pre-closing)
  const getNextPeriodForChef = (currentTime?: Date) => {
    const current = getCurrentPeriod(currentTime)
    const normalNext = getNextPeriod(currentTime)
    
    // Special case: if we're in pre-closing and next would be closing, skip to opening
    if (current?.id === 'pre-closing' && normalNext?.id === 'closing') {
      // Chef skips closing period and goes directly to opening (next day)
      return workflowPeriods.find(p => p.id === 'opening') || null
    }
    
    // For all other cases, use normal next period logic
    return normalNext
  }
  
  // Period update effect
  useEffect(() => {
    console.log('[ChefDashboard] Period update effect triggered')
    const updatePeriods = () => {
      console.log('[ChefDashboard] updatePeriods called - waitingRef:', waitingRef.current, 'isWaitingForNextDay:', isWaitingForNextDay)
      // IMPORTANT: Check waiting state FIRST before manual advance
      // Check waitingRef first for immediate feedback
      if (waitingRef.current || isWaitingForNextDay) {
        const current = getCurrentPeriod(testTime)
        // Only exit waiting state if we've reached opening time (10:00)
        if (current && current.id === 'opening') {
          console.log('[ChefDashboard] Exiting waiting state, entering opening period')
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
          console.log('[ChefDashboard] Time caught up to manually advanced period, clearing manual advance')
          setManuallyAdvancedPeriod(null)
          manualAdvanceRef.current = null
        } else {
          // console.log('[ChefDashboard] Keeping manually advanced period:', manualAdvanceRef.current)
          return // Don't update periods while manually advanced
        }
      }
      
      // Normal period updates
      if (!isManualClosing) {
        const current = getCurrentPeriod(testTime)
        const next = getNextPeriodForChef(testTime)
        console.log('[ChefDashboard] Normal period update - current:', current, 'next:', next)
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
  
  // Safety check: Clear invalid states
  useEffect(() => {
    // Only run this check after initialization
    if (!hasInitialized) return
    
    // Check if isManualClosing is stuck without a valid currentPeriod
    if (isManualClosing && !currentPeriod && !isWaitingForNextDay) {
      console.log('[DEBUG Safety Check] INVALID STATE DETECTED - isManualClosing=true but no currentPeriod and not waiting')
      console.log('[DEBUG Safety Check] Clearing isManualClosing to recover')
      
      // Clear the invalid state
      setIsManualClosing(false)
      
      // Also clear manual advance state just in case
      setManuallyAdvancedPeriod(null)
      manualAdvanceRef.current = null
    }
    
    // Check if we're stuck in manual closing but not in closing period
    if (isManualClosing && currentPeriod && currentPeriod.id !== 'closing') {
      console.log('[DEBUG Safety Check] INVALID STATE - isManualClosing=true but not in closing period')
      console.log('[DEBUG Safety Check] Current period:', currentPeriod.id)
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
        console.log('[Daily Reset] Crossing 10:00 AM - resetting all tasks')
        
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
    
    // Don't update missing tasks if we're in manual closing mode or have manually advanced
    // This prevents overwriting the missing tasks set during transition
    if (isManualClosing || currentPeriod.id === 'closing' || manuallyAdvancedPeriod) {
      console.log('Skipping missing tasks update during manual closing/closing period/manual advance')
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
          // Check for uncompleted tasks using completedTaskIds
          period.tasks.chef.forEach(task => {
            if (task.isNotice) return // Skip notices
            
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
          return now <= periodEnd || period.id === 'pre-closing'
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
    
    const newCompletedIds = [...completedTaskIds, taskId]
    setCompletedTaskIds(newCompletedIds)
    
    // Check if this is the last task in pre-closing period for chef
    if (currentPeriod?.id === 'pre-closing') {
      const allTasks = currentPeriod.tasks.chef.filter(t => !t.isNotice)
      const allCompleted = allTasks.every(task => newCompletedIds.includes(task.id))
      
      if (allCompleted) {
        // All pre-closing tasks completed, show completion message
        setShowPreClosingComplete(true)
      }
    }
    
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
  
  // Removed handleLastCustomerLeft as it's not used for Chef
  
  const handleClosingComplete = () => {
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
    
    console.log('[handleClosingComplete] Transitioned to waiting state')
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
    
    console.log('[handleAdvancePeriod] Advanced from', currentPeriod.id, 'to', nextPeriod.id, '- manual advance set')
  }
  
  const currentTasks = currentPeriod?.tasks.chef || []
  
  console.log('[ChefDashboard] Before render - currentPeriod:', currentPeriod)
  console.log('[ChefDashboard] Before render - currentTasks:', currentTasks)
  console.log('[ChefDashboard] Before render - isWaitingForNextDay:', isWaitingForNextDay)
  console.log('[ChefDashboard] Before render - nextPeriod:', nextPeriod)
  
  // Check for early returns
  if (selectedRole !== 'chef') {
    console.log('[ChefDashboard] WARNING: Selected role is not chef, but ChefDashboard is rendered!')
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
          <EditableTime testTime={testTime} onTimeChange={setTestTime} />
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
                  testTime={testTime}
                  onComplete={handleTaskComplete}
                  onComment={handleNoticeComment}
                  onLastCustomerLeft={undefined}
                  onClosingComplete={undefined} // Chef doesn't need closing button in TaskCountdown
                  onAdvancePeriod={handleAdvancePeriod}
                />
                
                {/* Show completion message and button for chef when pre-closing tasks are done */}
                {currentPeriod.id === 'pre-closing' && showPreClosingComplete && (
                  <Paper elevation={2} sx={{ p: 3, mt: 3, textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom sx={{ color: 'success.main' }}>
                      当前状态已完成
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      所有预打烊任务已完成
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
                role="chef"
              />
            </Grid>
          )}
        </Grid>
      </Container>
    </>
  )
  } catch (error) {
    console.error('[ChefDashboard] Error during render:', error)
    console.error('[ChefDashboard] Error stack:', error instanceof Error ? error.stack : 'No stack')
    throw error // Re-throw to be caught by error boundary
  } finally {
    console.log('[ChefDashboard] Component render completed (or failed)')
  }
}