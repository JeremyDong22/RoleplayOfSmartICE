// 值班经理任务触发上下文 - 用于管理前厅和值班经理之间的通信
// 更新：集成数据库持久化，支持离线查看任务提交
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react'
import type { TaskTemplate } from '../types/task.types'
import { realtimeDutyService } from '../services/realtimeDutyService'
import { supabase } from '../services/supabase'
import { dutyManagerPersistence } from '../services/dutyManagerPersistence'
import { authService } from '../services/authService'
import { restaurantConfigService } from '../services/restaurantConfigService'

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
  
  // 刷新状态
  refreshFromDatabase: () => Promise<void>
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
  const [isInitialized, setIsInitialized] = useState(false)
  const submissionInProgressRef = useRef<Set<string>>(new Set()) // 防止重复提交
  const realtimeInitRef = useRef(false) // 防止重复初始化 Realtime
  const initStartedRef = useRef(false) // 防止重复初始化整个服务

  // Initialize realtime service and load data from database
  useEffect(() => {
    // Use ref to ensure initialization only happens once
    if (initStartedRef.current) return
    initStartedRef.current = true
    
    const initServices = async () => {
      const currentUser = authService.getCurrentUser()
      const userId = currentUser?.id || 'demo-user-' + Date.now()
      
      // Try to initialize realtime service, but don't fail if it's not available
      if (!realtimeInitRef.current) {
        realtimeInitRef.current = true
        try {
          await realtimeDutyService.initialize(userId)
        } catch (error) {
          console.warn('[DutyManagerContext] Realtime service not available, continuing with database-only mode:', error)
          // Continue without realtime - database persistence will still work
        }
      }
      
      // Load data from database (this always works)
      try {
        const restaurantId = await restaurantConfigService.getRestaurantId() || ''
        
        // Load trigger status from database
        const trigger = await dutyManagerPersistence.getCurrentTrigger(restaurantId)
        if (trigger) {
          setCurrentTrigger(trigger)
        }
        
        // Load pending submissions from database
        const pendingSubmissions = await dutyManagerPersistence.getPendingSubmissions(restaurantId)
        if (pendingSubmissions.length > 0) {
          // 已从数据库加载提交记录
          setSubmissions(pendingSubmissions)
        }
        
        // Load task statuses to get review status
        const currentUser = authService.getCurrentUser()
        if (currentUser) {
          const { taskStatuses } = await dutyManagerPersistence.getDutyManagerTaskStatuses(
            currentUser.id,
            restaurantId
          )
          
          // Initialize review status from loaded task statuses
          const reviewStatuses: any = {}
          Object.entries(taskStatuses).forEach(([taskId, status]) => {
            if (status.status === 'submitted') {
              reviewStatuses[taskId] = {
                status: status.review_status || 'pending',
                reviewedAt: status.reviewedAt || status.submittedAt,
                reason: status.reject_reason
              }
            }
          })
          setReviewStatus(reviewStatuses)
        }
        setIsInitialized(true)
      } catch (error) {
        console.error('[DutyManagerContext] Error loading data from database:', error)
        setIsInitialized(true)
      }
    }
    
    initServices()
    
    // Don't cleanup on unmount - keep the connection alive
    // Only cleanup when the entire app unmounts
    return () => {
      // console.log('[DutyManagerContext] Component unmounting, but keeping Realtime connection')
      // Don't call cleanup here to prevent connection drops
    }
  }, [])

  // Subscribe to realtime messages
  useEffect(() => {
    // 设置 Realtime 监听器
    
    // Subscribe to realtime messages from other devices
    const unsubscribeRealtime = realtimeDutyService.subscribe('*', (message) => {
      // 处理 Realtime 消息
      
      if (message.type === 'TRIGGER' && message.data?.trigger) {
        // 处理 TRIGGER 消息
        const trigger = message.data.trigger
        trigger.triggeredAt = new Date(trigger.triggeredAt)
        setCurrentTrigger(trigger)
      } else if (message.type === 'SUBMISSION' && message.data?.submission) {
        // 处理 SUBMISSION 消息
        const submission = message.data.submission
        submission.submittedAt = new Date(submission.submittedAt)
        setSubmissions(prev => {
          const filtered = prev.filter(s => s.taskId !== submission.taskId)
          const newSubmissions = [...filtered, submission]
          // 更新 submissions
          return newSubmissions
        })
      } else if (message.type === 'CLEAR_SUBMISSIONS') {
        // 处理 CLEAR_SUBMISSIONS 消息
        setSubmissions([])
      } else if (message.type === 'REVIEW_STATUS' && message.data?.taskId) {
        // 处理 REVIEW_STATUS 消息
        const { taskId, reviewData } = message.data
        reviewData.reviewedAt = new Date(reviewData.reviewedAt)
        setReviewStatus(prev => ({
          ...prev,
          [taskId]: reviewData
        }))
        
        // 注意：不要清除被驳回任务的提交记录
        // 用户需要看到之前的提交内容（特别是照片）来知道如何修改
      }
    })
    
    return () => {
      unsubscribeRealtime()
    }
  }, [])

  // 移除localStorage相关代码，数据已从数据库加载

  // localStorage代码已移除，所有数据通过数据库持久化

  const setTrigger = async (trigger: DutyManagerTrigger) => {
    // Save to database first
    try {
      const currentUser = authService.getCurrentUser()
      const restaurantId = currentUser?.restaurantId || await restaurantConfigService.getRestaurantId() || ''
      await dutyManagerPersistence.saveTrigger(trigger, restaurantId)
      
      // Only update state if database save was successful
      setCurrentTrigger(trigger)
    } catch (error) {
      console.error('Failed to save trigger to database:', error)
      throw error // Propagate error to UI
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
      const restaurantId = await restaurantConfigService.getRestaurantId() || ''
      await dutyManagerPersistence.clearDailySubmissions(restaurantId)
    } catch (error) {
      console.error('Failed to clear trigger in database:', error)
    }
  }

  const addSubmission = async (submission: DutyManagerSubmission) => {
    // 防止重复提交
    if (submissionInProgressRef.current.has(submission.taskId)) {
      return
    }
    
    submissionInProgressRef.current.add(submission.taskId)
    
    // 处理任务提交
    
    // First try to save to database
    try {
      const currentUser = authService.getCurrentUser()
      if (!currentUser) {
        throw new Error('No authenticated user')
      }
      const userId = currentUser.id
      const restaurantId = currentUser.restaurantId || await restaurantConfigService.getRestaurantId() || ''
      await dutyManagerPersistence.saveSubmission(submission, userId, restaurantId)
      
      // Only update UI state if database save was successful
      // 如果是重新提交，先移除之前的提交记录
      setSubmissions(prev => {
        const filtered = prev.filter(s => s.taskId !== submission.taskId)
        const newSubmissions = [...filtered, submission]
        // 更新提交列表
        return newSubmissions
      })
      
      // 设置审核状态为待审核（无论是新提交还是重新提交）
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
      
      // Send via realtime to other devices (if available)
      try {
        await realtimeDutyService.sendSubmission(submission)
      } catch (error) {
        // Realtime not available, but database update succeeded
      }
    } catch (error) {
      console.error('[DutyManager] Failed to save to database:', error)
      throw error // Propagate error to UI
    } finally {
      // 清除进行中标记
      submissionInProgressRef.current.delete(submission.taskId)
    }
  }

  const clearSubmissions = async () => {
    setSubmissions([])
    
    // Clear in database
    try {
      const restaurantId = await restaurantConfigService.getRestaurantId() || ''
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
      const currentUser = authService.getCurrentUser()
      if (!currentUser) {
        throw new Error('No authenticated user for review')
      }
      const reviewerId = currentUser.id
      await dutyManagerPersistence.updateReviewStatus(taskId, status, reviewerId, reason)
    } catch (error) {
      console.error('[DutyManagerContext] Failed to save review to database:', error)
    }
    
    // 注意：不要清除被驳回任务的提交记录
    // 用户需要看到之前的提交内容（特别是照片）来知道如何修改
    
    // Send via realtime to other devices (if available)
    try {
      await realtimeDutyService.sendReviewStatus(taskId, reviewData)
    } catch (error) {
      // Realtime not available, but database update succeeded
    }
  }

  // 从数据库刷新状态
  const refreshFromDatabase = async () => {
    // 从数据库刷新状态
    try {
      const restaurantId = await restaurantConfigService.getRestaurantId() || ''
      const currentUser = authService.getCurrentUser()
      
      if (currentUser) {
        // 重新加载任务状态
        const { taskStatuses } = await dutyManagerPersistence.getDutyManagerTaskStatuses(
          currentUser.id,
          restaurantId
        )
        
        // 清空现有状态，完全从数据库重建
        const reviewStatuses: any = {}
        const allSubmissions: DutyManagerSubmission[] = []
        
        // 从数据库记录重建状态
        Object.entries(taskStatuses).forEach(([taskId, status]) => {
          if (status.status === 'submitted') {
            // 设置审核状态
            reviewStatuses[taskId] = {
              status: status.review_status || 'pending',
              reviewedAt: status.reviewedAt || status.submittedAt,
              reason: status.reject_reason
            }
            
            // 如果任务已提交，添加到提交列表
            // 从taskStatuses中获取提交信息
            const record = (status as any)
            if (record.submissionData) {
              allSubmissions.push({
                taskId: taskId,
                taskTitle: record.taskTitle || '',
                submittedAt: status.submittedAt,
                content: record.submissionData
              })
            }
          }
        })
        
        // 获取今天的待审核任务
        const pendingSubmissions = await dutyManagerPersistence.getPendingSubmissions(restaurantId)
        
        // 合并提交记录（优先使用 pendingSubmissions 的数据）
        const submissionMap = new Map<string, DutyManagerSubmission>()
        pendingSubmissions.forEach(sub => submissionMap.set(sub.taskId, sub))
        allSubmissions.forEach(sub => {
          if (!submissionMap.has(sub.taskId)) {
            submissionMap.set(sub.taskId, sub)
          }
        })
        
        // 更新状态 - 完全覆盖 Realtime 的状态
        setReviewStatus(reviewStatuses)
        setSubmissions(Array.from(submissionMap.values()))
        
        // 数据库刷新完成
      }
    } catch (error) {
      console.error('[DutyManagerContext] Error refreshing from database:', error)
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
    refreshFromDatabase,
  }

  return (
    <DutyManagerContext.Provider value={value}>
      {children}
    </DutyManagerContext.Provider>
  )
}