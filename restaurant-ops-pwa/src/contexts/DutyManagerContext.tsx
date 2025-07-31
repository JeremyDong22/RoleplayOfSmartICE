// 值班经理任务触发上下文 - 用于管理前厅和值班经理之间的通信
// 更新：集成数据库持久化，支持离线查看任务提交
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { TaskTemplate } from '../utils/workflowParser'
import { realtimeDutyService } from '../services/realtimeDutyService'
import { supabase } from '../services/supabase'
import { dutyManagerPersistence } from '../services/dutyManagerPersistence'

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
  setTrigger: (trigger: DutyManagerTrigger) => Promise<void>
  clearTrigger: () => Promise<void>
  
  // 任务提交状态
  submissions: DutyManagerSubmission[]
  addSubmission: (submission: DutyManagerSubmission) => Promise<void>
  clearSubmissions: () => Promise<void>
  
  // 审核状态
  reviewStatus: {
    [taskId: string]: {
      status: 'pending' | 'approved' | 'rejected'
      reviewedAt?: Date
      reason?: string
    }
  }
  updateReviewStatus: (taskId: string, status: 'approved' | 'rejected', reason?: string) => Promise<void>
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

  // Initialize realtime service and load data from database
  useEffect(() => {
    const initServices = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user ? user.id : 'mock-user-' + Date.now()
      
      // Try to initialize realtime service, but don't fail if it's not available
      try {
        await realtimeDutyService.initialize(userId)
        console.log('[DutyManagerContext] Realtime service connected')
      } catch (error) {
        console.warn('[DutyManagerContext] Realtime service not available, continuing with database-only mode:', error)
        // Continue without realtime - database persistence will still work
      }
      
      // Load data from database (this always works)
      try {
        const restaurantId = localStorage.getItem('selectedRestaurantId') || 'default-restaurant'
        
        // Load trigger status from database
        const trigger = await dutyManagerPersistence.getCurrentTrigger(restaurantId)
        if (trigger) {
          setCurrentTrigger(trigger)
        }
        
        // Load pending submissions from database
        const pendingSubmissions = await dutyManagerPersistence.getPendingSubmissions(restaurantId)
        if (pendingSubmissions.length > 0) {
          console.log('[DutyManagerContext] Loaded submissions from database:', pendingSubmissions)
          setSubmissions(pendingSubmissions)
          
          // Initialize review status for loaded submissions
          const reviewStatuses: any = {}
          pendingSubmissions.forEach(sub => {
            reviewStatuses[sub.taskId] = {
              status: 'pending',
              reviewedAt: new Date()
            }
          })
          setReviewStatus(reviewStatuses)
        }
      } catch (error) {
        console.error('[DutyManagerContext] Error loading data from database:', error)
      }
    }
    initServices()
    
    return () => {
      realtimeDutyService.cleanup()
    }
  }, [])

  // Subscribe to realtime messages
  useEffect(() => {
    // Subscribe to realtime messages from other devices
    const unsubscribeRealtime = realtimeDutyService.subscribe('*', (message) => {
      // Process realtime messages
      
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
    
    return () => {
      unsubscribeRealtime()
    }
  }, [])

  // 移除localStorage相关代码，数据已从数据库加载

  // localStorage代码已移除，所有数据通过数据库持久化

  const setTrigger = async (trigger: DutyManagerTrigger) => {
    setCurrentTrigger(trigger)
    
    // Save to database
    try {
      const restaurantId = localStorage.getItem('selectedRestaurantId') || 'default-restaurant'
      await dutyManagerPersistence.saveTrigger(trigger, restaurantId)
    } catch (error) {
      console.error('Failed to save trigger to database:', error)
    }
    
    // Send via realtime to other devices
    try {
      await realtimeDutyService.sendTrigger(trigger)
    } catch (error) {
      console.error('Failed to send trigger via realtime:', error)
    }
  }

  const clearTrigger = async () => {
    setCurrentTrigger(null)
    // 同时清除相关的提交和审核状态
    setSubmissions([])
    setReviewStatus({})
    
    // Clear in database
    try {
      const restaurantId = localStorage.getItem('selectedRestaurantId') || 'default-restaurant'
      await dutyManagerPersistence.clearDailySubmissions(restaurantId)
    } catch (error) {
      console.error('Failed to clear trigger in database:', error)
    }
  }

  const addSubmission = async (submission: DutyManagerSubmission) => {
    console.log('[DutyManagerContext] addSubmission called with:', {
      taskId: submission.taskId,
      content: submission.content,
      photoGroups: submission.content.photoGroups,
      photos: submission.content.photos
    })
    
    // 如果是重新提交，先移除之前的提交记录
    setSubmissions(prev => {
      const filtered = prev.filter(s => s.taskId !== submission.taskId)
      const newSubmissions = [...filtered, submission]
      console.log('[DutyManagerContext] Updated submissions:', newSubmissions)
      return newSubmissions
    })
    
    // Save to database
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || 'mock-user'
      const restaurantId = localStorage.getItem('selectedRestaurantId') || 'default-restaurant'
      await dutyManagerPersistence.saveSubmission(submission, userId, restaurantId)
    } catch (error) {
      console.error('Failed to save submission to database:', error)
    }
    
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
      
      // Send via realtime (if available)
      try {
        await realtimeDutyService.sendReviewStatus(submission.taskId, newReviewData)
      } catch (error) {
        // Realtime not available, but database update succeeded
      }
    }
    
    // Send via realtime to other devices (if available)
    try {
      await realtimeDutyService.sendSubmission(submission)
    } catch (error) {
      // Realtime not available, but database update succeeded
    }
  }

  const clearSubmissions = async () => {
    setSubmissions([])
    
    // Clear in database
    try {
      const restaurantId = localStorage.getItem('selectedRestaurantId') || 'default-restaurant'
      await dutyManagerPersistence.clearDailySubmissions(restaurantId)
    } catch (error) {
      console.error('Failed to clear submissions in database:', error)
    }
    
    // Send via realtime (if available)
    try {
      await realtimeDutyService.clearSubmissions()
    } catch (error) {
      // Realtime not available, but database update succeeded
    }
  }

  const updateReviewStatus = async (taskId: string, status: 'approved' | 'rejected', reason?: string) => {
    const reviewData = {
      status,
      reviewedAt: new Date(),
      reason
    }
    setReviewStatus(prev => ({
      ...prev,
      [taskId]: reviewData
    }))
    
    // 更新数据库中的审核状态
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const reviewerId = user?.id || 'mock-reviewer'
      await dutyManagerPersistence.updateReviewStatus(taskId, status, reviewerId, reason)
    } catch (error) {
      console.error('[DutyManagerContext] Failed to save review to database:', error)
    }
    
    // 如果是驳回，清除该任务的提交记录
    if (status === 'rejected') {
      // Clear submission for rejected task
      setSubmissions(prev => prev.filter(s => s.taskId !== taskId))
    }
    
    // Send via realtime to other devices (if available)
    try {
      await realtimeDutyService.sendReviewStatus(taskId, reviewData)
    } catch (error) {
      // Realtime not available, but database update succeeded
    }
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