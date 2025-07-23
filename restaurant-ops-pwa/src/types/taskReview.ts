// Task review system types
// Created: Types for the task review workflow between duty manager and front office manager

export type TaskReviewStatus = 'pending' | 'in_review' | 'approved' | 'rejected'

export interface ExtendedTaskStatus {
  taskId: string
  completed: boolean
  completedAt?: Date
  overdue: boolean
  evidence?: any
  // New fields for review workflow
  reviewStatus?: TaskReviewStatus
  rejectionReason?: string
  rejectedAt?: Date
  resubmittedAt?: Date
  submissionCount?: number // Track how many times the task has been submitted
}

export interface DutyManagerTaskStatus {
  taskId: string
  status: 'pending' | 'in_review' | 'rejected' | 'approved'
  submittedAt?: Date
  rejectedAt?: Date
  rejectionReason?: string
  approvedAt?: Date
  submissionData?: any
}