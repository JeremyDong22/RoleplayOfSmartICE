// 值班经理任务触发上下文 - 用于管理前厅和值班经理之间的通信
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { TaskTemplate } from '../utils/workflowParser'
import { broadcastService } from '../services/broadcastService'
import { realtimeDutyService } from '../services/realtimeDutyService'
import { supabase } from '../utils/supabase'

// 照片组结构
export interface PhotoGroup {
  id: string
  photos: string[]
  sampleRef?: string
  sampleIndex?: number
  comment?: string
}

export interface DutyManagerSubmission {
  taskId: string
  taskTitle: string
  submittedAt: Date
  content: {
    photos?: string[] // 保留兼容性
    photoGroups?: PhotoGroup[] // 新增：照片组数据
    text?: string
    amount?: number
  }
}

interface DutyManagerTrigger {
  type: 'last-customer-left-lunch' | 'last-customer-left-dinner'
  triggeredAt: Date
  triggeredBy: string // Manager ID
}

interface DutyManagerContextType {
  // 触发状态
  currentTrigger: DutyManagerTrigger | null
  setTrigger: (trigger: DutyManagerTrigger) => void
  clearTrigger: () => void
  
  // 任务提交状态
  submissions: DutyManagerSubmission[]
  addSubmission: (submission: DutyManagerSubmission) => void
  clearSubmissions: () => void
  
  // 审核状态
  reviewStatus: {
    [taskId: string]: {
      status: 'pending' | 'approved' | 'rejected'
      reviewedAt?: Date
      reason?: string
    }
  }
  updateReviewStatus: (taskId: string, status: 'approved' | 'rejected', reason?: string) => void
}

const DutyManagerContext = createContext<DutyManagerContextType | undefined>(undefined)

export const useDutyManager = () => {
  const context = useContext(DutyManagerContext)
  if (!context) {
    throw new Error('useDutyManager must be used within DutyManagerProvider')
  }
  return context
}

interface DutyManagerProviderProps {
  children: ReactNode
}

export const DutyManagerProvider: React.FC<DutyManagerProviderProps> = ({ children }) => {
  const [currentTrigger, setCurrentTrigger] = useState<DutyManagerTrigger | null>(null)
  const [submissions, setSubmissions] = useState<DutyManagerSubmission[]>([])
  const [reviewStatus, setReviewStatus] = useState<{
    [taskId: string]: {
      status: 'pending' | 'approved' | 'rejected'
      reviewedAt?: Date
      reason?: string
    }
  }>({})

  // Initialize realtime service
  useEffect(() => {
    const initRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await realtimeDutyService.initialize(user.id)
      }
    }
    initRealtime()
    
    return () => {
      realtimeDutyService.cleanup()
    }
  }, [])

  // Subscribe to realtime messages (replacing broadcast messages)
  useEffect(() => {
    // Subscribe to realtime messages from other devices
    const unsubscribeRealtime = realtimeDutyService.subscribe('*', (message) => {
      console.log('Received realtime message:', message)
      
      if (message.type === 'TRIGGER' && message.data?.trigger) {
        const trigger = message.data.trigger
        trigger.triggeredAt = new Date(trigger.triggeredAt)
        setCurrentTrigger(trigger)
      } else if (message.type === 'SUBMISSION' && message.data?.submission) {
        const submission = message.data.submission
        submission.submittedAt = new Date(submission.submittedAt)
        setSubmissions(prev => {
          const filtered = prev.filter(s => s.taskId !== submission.taskId)
          return [...filtered, submission]
        })
      } else if (message.type === 'CLEAR_SUBMISSIONS') {
        setSubmissions([])
      } else if (message.type === 'REVIEW_STATUS' && message.data?.taskId) {
        const { taskId, reviewData } = message.data
        reviewData.reviewedAt = new Date(reviewData.reviewedAt)
        setReviewStatus(prev => ({
          ...prev,
          [taskId]: reviewData
        }))
        
        if (reviewData.status === 'rejected') {
          setSubmissions(prev => prev.filter(s => s.taskId !== taskId))
        }
      }
    })

    // Also keep broadcast for same-device communication
    const unsubscribeBroadcast = broadcastService.subscribe('STATE_SYNC', (message) => {
      if (message.data?.type === 'DUTY_MANAGER_TRIGGER' && message.data.trigger) {
        const trigger = message.data.trigger
        trigger.triggeredAt = new Date(trigger.triggeredAt)
        setCurrentTrigger(trigger)
      } else if (message.data?.type === 'DUTY_MANAGER_SUBMISSION' && message.data.submission) {
        const submission = message.data.submission
        submission.submittedAt = new Date(submission.submittedAt)
        setSubmissions(prev => {
          // 如果是重新提交，替换原有的提交记录
          const filtered = prev.filter(s => s.taskId !== submission.taskId)
          return [...filtered, submission]
        })
      } else if (message.data?.type === 'DUTY_MANAGER_CLEAR_SUBMISSIONS') {
        setSubmissions([])
      } else if (message.data?.type === 'DUTY_MANAGER_REVIEW_STATUS' && message.data.taskId) {
        const { taskId, reviewData } = message.data
        reviewData.reviewedAt = new Date(reviewData.reviewedAt)
        setReviewStatus(prev => ({
          ...prev,
          [taskId]: reviewData
        }))
        
        // 如果是驳回，也要清除提交记录
        if (reviewData.status === 'rejected') {
          // console.log(`Broadcast: Clearing submission for rejected task ${taskId}`)
          setSubmissions(prev => prev.filter(s => s.taskId !== taskId))
        }
      }
    })
    
    return () => {
      unsubscribeRealtime()
      unsubscribeBroadcast()
    }
  }, [])

  // 从localStorage恢复状态
  useEffect(() => {
    const savedTrigger = localStorage.getItem('dutyManagerTrigger')
    if (savedTrigger) {
      try {
        const trigger = JSON.parse(savedTrigger)
        trigger.triggeredAt = new Date(trigger.triggeredAt)
        setCurrentTrigger(trigger)
      } catch (e) {
        // Failed to parse saved trigger
      }
    }

    const savedSubmissions = localStorage.getItem('dutyManagerSubmissions')
    if (savedSubmissions) {
      try {
        const subs = JSON.parse(savedSubmissions)
        subs.forEach((s: any) => {
          s.submittedAt = new Date(s.submittedAt)
        })
        setSubmissions(subs)
      } catch (e) {
        // Failed to parse saved submissions
      }
    }

    const savedReviewStatus = localStorage.getItem('dutyManagerReviewStatus')
    if (savedReviewStatus) {
      try {
        const status = JSON.parse(savedReviewStatus)
        Object.keys(status).forEach(key => {
          if (status[key].reviewedAt) {
            status[key].reviewedAt = new Date(status[key].reviewedAt)
          }
        })
        setReviewStatus(status)
      } catch (e) {
        // Failed to parse saved review status
      }
    }
  }, [])

  // 保存到localStorage
  useEffect(() => {
    if (currentTrigger) {
      localStorage.setItem('dutyManagerTrigger', JSON.stringify(currentTrigger))
    } else {
      localStorage.removeItem('dutyManagerTrigger')
    }
  }, [currentTrigger])

  useEffect(() => {
    if (submissions.length > 0) {
      localStorage.setItem('dutyManagerSubmissions', JSON.stringify(submissions))
    } else {
      localStorage.removeItem('dutyManagerSubmissions')
    }
  }, [submissions])

  useEffect(() => {
    if (Object.keys(reviewStatus).length > 0) {
      localStorage.setItem('dutyManagerReviewStatus', JSON.stringify(reviewStatus))
    } else {
      localStorage.removeItem('dutyManagerReviewStatus')
    }
  }, [reviewStatus])

  const setTrigger = (trigger: DutyManagerTrigger) => {
    setCurrentTrigger(trigger)
    // Broadcast the trigger to other tabs (same device)
    broadcastService.send('STATE_SYNC', {
      type: 'DUTY_MANAGER_TRIGGER',
      trigger
    })
    // Send via realtime to other devices
    realtimeDutyService.sendTrigger(trigger)
  }

  const clearTrigger = () => {
    setCurrentTrigger(null)
    // 同时清除相关的提交和审核状态
    setSubmissions([])
    setReviewStatus({})
  }

  const addSubmission = (submission: DutyManagerSubmission) => {
    // 如果是重新提交，先移除之前的提交记录
    setSubmissions(prev => {
      const filtered = prev.filter(s => s.taskId !== submission.taskId)
      return [...filtered, submission]
    })
    
    // 如果是重新提交（之前被驳回），清除驳回状态
    if (reviewStatus[submission.taskId]?.status === 'rejected') {
      const newReviewData = {
        status: 'pending' as const,
        reviewedAt: new Date()
      }
      
      setReviewStatus(prev => ({
        ...prev,
        [submission.taskId]: newReviewData
      }))
      
      // 广播审核状态的更新！这很重要！
      broadcastService.send('STATE_SYNC', {
        type: 'DUTY_MANAGER_REVIEW_STATUS',
        taskId: submission.taskId,
        reviewData: newReviewData
      })
      // Send via realtime
      realtimeDutyService.sendReviewStatus(submission.taskId, newReviewData)
    }
    
    // Broadcast the submission to other tabs
    broadcastService.send('STATE_SYNC', {
      type: 'DUTY_MANAGER_SUBMISSION',
      submission
    })
    // Send via realtime to other devices
    realtimeDutyService.sendSubmission(submission)
  }

  const clearSubmissions = () => {
    setSubmissions([])
    // Broadcast the clear action
    broadcastService.send('STATE_SYNC', {
      type: 'DUTY_MANAGER_CLEAR_SUBMISSIONS'
    })
    // Send via realtime
    realtimeDutyService.clearSubmissions()
  }

  const updateReviewStatus = (taskId: string, status: 'approved' | 'rejected', reason?: string) => {
    const reviewData = {
      status,
      reviewedAt: new Date(),
      reason
    }
    setReviewStatus(prev => ({
      ...prev,
      [taskId]: reviewData
    }))
    
    // 如果是驳回，清除该任务的提交记录
    if (status === 'rejected') {
      // console.log(`Clearing submission for rejected task ${taskId}`)
      setSubmissions(prev => prev.filter(s => s.taskId !== taskId))
    }
    
    // Broadcast the review status update
    broadcastService.send('STATE_SYNC', {
      type: 'DUTY_MANAGER_REVIEW_STATUS',
      taskId,
      reviewData
    })
    // Send via realtime to other devices
    realtimeDutyService.sendReviewStatus(taskId, reviewData)
  }

  const value: DutyManagerContextType = {
    currentTrigger,
    setTrigger,
    clearTrigger,
    submissions,
    addSubmission,
    clearSubmissions,
    reviewStatus,
    updateReviewStatus,
  }

  return (
    <DutyManagerContext.Provider value={value}>
      {children}
    </DutyManagerContext.Provider>
  )
}