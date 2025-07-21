// 值班经理任务触发上下文 - 用于管理前厅和值班经理之间的通信
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { TaskTemplate } from '../utils/workflowParser'

export interface DutyManagerSubmission {
  taskId: string
  taskTitle: string
  submittedAt: Date
  content: {
    photos?: string[]
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

  // 从localStorage恢复状态
  useEffect(() => {
    const savedTrigger = localStorage.getItem('dutyManagerTrigger')
    if (savedTrigger) {
      try {
        const trigger = JSON.parse(savedTrigger)
        trigger.triggeredAt = new Date(trigger.triggeredAt)
        setCurrentTrigger(trigger)
      } catch (e) {
        console.error('Failed to parse saved trigger:', e)
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
        console.error('Failed to parse saved submissions:', e)
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
        console.error('Failed to parse saved review status:', e)
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
  }

  const clearTrigger = () => {
    setCurrentTrigger(null)
    // 同时清除相关的提交和审核状态
    setSubmissions([])
    setReviewStatus({})
  }

  const addSubmission = (submission: DutyManagerSubmission) => {
    setSubmissions(prev => [...prev, submission])
  }

  const clearSubmissions = () => {
    setSubmissions([])
  }

  const updateReviewStatus = (taskId: string, status: 'approved' | 'rejected', reason?: string) => {
    setReviewStatus(prev => ({
      ...prev,
      [taskId]: {
        status,
        reviewedAt: new Date(),
        reason
      }
    }))
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