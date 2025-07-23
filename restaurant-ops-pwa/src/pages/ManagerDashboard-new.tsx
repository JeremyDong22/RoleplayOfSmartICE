// Manager Dashboard with status island and new timer display
// Updated: Added debug logs for isManualClosing state tracking and recovery mechanism for stuck states
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
import { broadcastService } from '../services/broadcastService'
import { getCurrentTestTime } from '../utils/globalTestTime'
import { clearAllAppStorage } from '../utils/clearAllStorage'

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
  // 过滤只显示 Manager 的浮动任务
  const floatingTasks = allFloatingTasks.filter(task => task.role === 'Manager')
  
  // Debug: 打印浮动任务信息
  useEffect(() => {
    console.log('=== Manager Dashboard Debug ===')
    console.log('All floating tasks:', allFloatingTasks)
    console.log('Manager floating tasks:', floatingTasks)
    console.log('Current period:', currentPeriod?.id)
  }, [allFloatingTasks, floatingTasks, currentPeriod?.id])
  
  // Load state from localStorage on mount
  useEffect(() => {
    if (!hasInitialized) {
      const savedState = loadState('manager')
      if (savedState) {
        // Check for invalid stuck state BEFORE applying it
        if (savedState.isManualClosing && !savedState.isWaitingForNextDay) {
          savedState.isManualClosing = false
        }
        
        setCompletedTaskIds(savedState.completedTaskIds)
        setTaskStatuses(savedState.taskStatuses)
        setNoticeComments(savedState.noticeComments)
        setMissingTasks(savedState.missingTasks)
        setIsManualClosing(savedState.isManualClosing)
        setIsWaitingForNextDay(savedState.isWaitingForNextDay)
        manualClosingRef.current = savedState.isManualClosing
        setManuallyAdvancedPeriod(savedState.manuallyAdvancedPeriod || null)
        manualAdvanceRef.current = savedState.manuallyAdvancedPeriod || null
        setPreClosingTasks(savedState.preClosingTasks || [])
        // Restore testTime if saved
        if (savedState.testTime) {
          setTestTime(new Date(savedState.testTime))
        }
      }
      
      // Also check for global test time
      const globalTestTime = getCurrentTestTime()
      if (globalTestTime && !savedState?.testTime) {
        setTestTime(globalTestTime)
      }
      
      setHasInitialized(true)
    }
  }, [hasInitialized])
  
  // Listen for clear storage broadcast from other tabs
  useEffect(() => {
    const unsubscribe = broadcastService.subscribe('CLEAR_ALL_STORAGE', (message) => {
      // Clear all storage and reload
      clearAllAppStorage()
      window.location.reload()
    })
    
    return () => {
      unsubscribe()
    }
  }, [])
  
  // Save state to localStorage whenever key states change
  useEffect(() => {
    if (hasInitialized) {
      saveState('manager', {
        completedTaskIds,
        taskStatuses,
        noticeComments,
        missingTasks,
        isManualClosing,
        isWaitingForNextDay,
        manuallyAdvancedPeriod,
        preClosingTasks,
        testTime: testTime?.toISOString() || null
      })
    }
  }, [completedTaskIds, taskStatuses, noticeComments, missingTasks, isManualClosing, isWaitingForNextDay, manuallyAdvancedPeriod, preClosingTasks, testTime, hasInitialized])
  
  // Period update effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null
    
    const updatePeriods = () => {
      // Skip all updates if we're in manual closing mode (check ref for immediate value)
      if (manualClosingRef.current || isManualClosing) {
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
  }, [testTime, isManualClosing, isWaitingForNextDay, manuallyAdvancedPeriod])
  
  
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
        
        // Reset all task-related states
        setTaskStatuses([])
        setCompletedTaskIds([])
        setNoticeComments([])
        setMissingTasks([])
        setPreClosingTasks([])
        
        // Always clear waiting state and manual advance state at daily reset
        setIsWaitingForNextDay(false)
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
        const [periodEndHour, periodEndMinute] = period.endTime.split(':').map(Number)
        const periodEnd = new Date(now)
        periodEnd.setHours(periodEndHour, periodEndMinute, 0, 0)
        
        // If this period has ended and it's not the current period
        // Skip event-driven periods (pre-closing, closing) as they don't end by time
        if (now > periodEnd && period.id !== currentPeriod.id && !period.isEventDriven) {
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
        
        return uniqueTasks
      })
    }

    updateMissingTasks()
    const interval = setInterval(updateMissingTasks, 5000) // Check every 5 seconds instead of every second
    
    return () => clearInterval(interval)
  }, [testTime, currentPeriod?.id, workflowPeriods, completedTaskIds, isManualClosing])
  
  // Overdue status update effect
  useEffect(() => {
    // Skip event-driven periods (pre-closing, closing) as they don't have fixed end times
    if (!currentPeriod || currentPeriod.isEventDriven || currentPeriod.id === 'pre-closing' || currentPeriod.id === 'closing') return
    
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
      console.log('[ManagerDashboard] Processing DutyManager task submission:', {
        taskId,
        taskTitle: task.title,
        data
      })
      
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
      
      console.log('[ManagerDashboard] Adding submission to DutyManagerContext:', submission)
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
    
    // TODO: Submit task data to backend
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
    navigate('/')
  }
  
  
  const handleLastCustomerLeft = () => {
    // Send broadcast message
    broadcastService.send('LAST_CUSTOMER_LEFT_DINNER', {
      period: currentPeriod?.id,
      timestamp: Date.now()
    }, 'manager')
    
    // 使用Context设置触发状态
    setTrigger({
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
    setIsManualClosing(false)
    setManuallyAdvancedPeriod(null)
    manualAdvanceRef.current = null
    setIsWaitingForNextDay(false)
    waitingRef.current = false
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
  
  // When in closing period, concatenate pre-closing tasks with closing tasks
  // Always append floating tasks at the end
  const baseTasks = currentPeriod?.id === 'closing' && preClosingTasks.length > 0
    ? [...preClosingTasks, ...(currentPeriod?.tasks?.manager || [])]
    : currentPeriod?.tasks?.manager || []
  
  const currentTasks = [...baseTasks, ...floatingTasks]
  
  // Debug log for current tasks
  useEffect(() => {
    console.log('Current period:', currentPeriod?.id)
    console.log('Current tasks:', currentTasks.map(t => ({ id: t.id, title: t.title, uploadRequirement: t.uploadRequirement })))
    console.log('Base tasks count:', baseTasks.length)
    console.log('Floating tasks count:', floatingTasks.length)
  }, [currentPeriod?.id, currentTasks.length])
  
  const shouldShowClosedDisplay = !currentPeriod || isWaitingForNextDay
  
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
                onLastCustomerLeft={handleLastCustomerLeft}
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