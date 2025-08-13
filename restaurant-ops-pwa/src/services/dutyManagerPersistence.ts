// 值班经理任务持久化服务
// 用于将值班经理的任务提交保存到数据库，支持离线查看
// Updated: 2025-08-02 - Added test time support for date queries

import { supabase } from './supabase'
import type { DutyManagerSubmission } from '../contexts/DutyManagerContext'
import { getCurrentTestTime } from '../utils/globalTestTime'

interface DutyManagerTrigger {
  type: 'last-customer-left-lunch' | 'last-customer-left-dinner'
  triggeredAt: Date
  triggeredBy: string
}

export class DutyManagerPersistenceService {
  // 保存值班经理触发事件
  async saveTrigger(trigger: DutyManagerTrigger, restaurantId: string) {
    try {
      // 使用 submission_metadata 存储触发信息
      const { error } = await supabase
        .from('roleplay_task_records')
        .insert({
          user_id: trigger.triggeredBy,
          restaurant_id: restaurantId,
          task_id: `trigger-${trigger.type}`,
          date: (getCurrentTestTime() || new Date()).toISOString().split('T')[0],
          status: 'completed',
          submission_type: 'trigger',
          submission_metadata: {
            triggerType: trigger.type,
            triggeredAt: trigger.triggeredAt,
            triggeredBy: trigger.triggeredBy
          },
          created_at: trigger.triggeredAt
        })
      
      if (error) throw error
      console.log('[DutyManagerPersistence] Trigger saved to database')
    } catch (error) {
      console.error('[DutyManagerPersistence] Failed to save trigger:', error)
      throw error
    }
  }

  // 保存值班经理任务提交
  async saveSubmission(submission: DutyManagerSubmission, userId: string, restaurantId: string) {
    try {
      const { error } = await supabase
        .from('roleplay_task_records')
        .insert({
          user_id: userId,
          restaurant_id: restaurantId,
          task_id: submission.taskId,
          date: (getCurrentTestTime() || new Date()).toISOString().split('T')[0],
          period_id: 'closing',
          status: 'submitted',
          submission_type: submission.content.photos ? 'photo' : 'text',
          text_content: submission.content.text,
          photo_urls: submission.content.photos,
          submission_metadata: {
            photoGroups: submission.content.photoGroups,
            amount: submission.content.amount,
            submittedAt: submission.submittedAt
          },
          review_status: 'pending',
          created_at: submission.submittedAt
        })
      
      if (error) throw error
      console.log('[DutyManagerPersistence] Submission saved to database:', submission.taskId)
    } catch (error) {
      console.error('[DutyManagerPersistence] Failed to save submission:', error)
      throw error
    }
  }

  // 获取值班经理当天的所有任务状态（用于恢复UI状态）
  async getDutyManagerTaskStatuses(userId: string, restaurantId: string, date?: string) {
    try {
      // Validate restaurant ID to prevent UUID errors
      if (!restaurantId || restaurantId.trim() === '') {
        console.log('[DutyManagerPersistence] No restaurant ID provided, skipping task statuses fetch')
        return { taskStatuses: {}, submissions: [] }
      }
      
      const targetDate = date || (getCurrentTestTime() || new Date()).toISOString().split('T')[0]
      
      // 首先获取所有duty_manager角色的任务ID
      const { data: dutyManagerTasks, error: tasksError } = await supabase
        .from('roleplay_tasks')
        .select('id')
        .eq('role_code', 'duty_manager')
        .eq('restaurant_id', restaurantId)
      
      if (tasksError) throw tasksError
      
      const dutyManagerTaskIds = dutyManagerTasks?.map(t => t.id) || []
      
      if (dutyManagerTaskIds.length === 0) {
        return { taskStatuses: {}, submissions: [] }
      }
      
      const { data, error } = await supabase
        .from('roleplay_task_records')
        .select(`
          *,
          task:roleplay_tasks(id, title)
        `)
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId)
        .eq('date', targetDate)
        .in('task_id', dutyManagerTaskIds)
        .order('created_at', { ascending: false })

      if (error) throw error

      // 转换为任务状态映射 - 只保留每个任务的最新记录
      const taskStatuses: { [taskId: string]: any } = {}
      const submissions: DutyManagerSubmission[] = []
      const processedTaskIds = new Set<string>()
      
      // data已经按created_at降序排列，所以第一个出现的是最新的
      data.forEach(record => {
        if (!processedTaskIds.has(record.task_id)) {
          processedTaskIds.add(record.task_id)
          
          taskStatuses[record.task_id] = {
            status: record.status,
            review_status: record.review_status,
            submittedAt: new Date(record.created_at),
            reviewedAt: record.reviewed_at ? new Date(record.reviewed_at) : null,
            reject_reason: record.reject_reason
          }
          
          // 如果任务已提交（包括被驳回的），添加到submissions
          // 这样用户可以看到之前的提交内容来进行修改
          if (record.status === 'submitted') {
            submissions.push({
              taskId: record.task_id,
              taskTitle: record.task?.title || '',
              submittedAt: new Date(record.created_at),
              content: {
                photos: record.photo_urls,
                photoGroups: record.submission_metadata?.photoGroups,
                text: record.text_content,
                amount: record.submission_metadata?.amount
              }
            })
          }
        }
      })

      return { taskStatuses, submissions }
    } catch (error) {
      console.error('[DutyManagerPersistence] Failed to fetch task statuses:', error)
      return { taskStatuses: {}, submissions: [] }
    }
  }

  // 获取待审核和被驳回的值班经理任务
  async getPendingSubmissions(restaurantId: string, date?: string): Promise<DutyManagerSubmission[]> {
    try {
      // Validate restaurant ID to prevent UUID errors
      if (!restaurantId || restaurantId.trim() === '') {
        console.log('[DutyManagerPersistence] No restaurant ID provided, skipping submissions fetch')
        return []
      }
      
      // 首先获取所有duty_manager角色的任务ID
      const { data: dutyManagerTasks, error: tasksError } = await supabase
        .from('roleplay_tasks')
        .select('id')
        .eq('role_code', 'duty_manager')
        .eq('restaurant_id', restaurantId)
      
      if (tasksError) throw tasksError
      
      const dutyManagerTaskIds = dutyManagerTasks?.map(t => t.id) || []
      
      if (dutyManagerTaskIds.length === 0) {
        return []
      }
      
      const query = supabase
        .from('roleplay_task_records')
        .select(`
          *,
          task:roleplay_tasks(id, title)
        `)
        .eq('restaurant_id', restaurantId)
        .in('review_status', ['pending', 'rejected'])
        .in('task_id', dutyManagerTaskIds)
        .order('created_at', { ascending: false })

      if (date) {
        query.eq('date', date)
      } else {
        // 默认获取当天的任务
        query.eq('date', (getCurrentTestTime() || new Date()).toISOString().split('T')[0])
      }

      const { data, error } = await query

      if (error) throw error

      return data.map(record => ({
        taskId: record.task_id,
        taskTitle: record.task?.title || '',
        submittedAt: new Date(record.created_at),
        content: {
          photos: record.photo_urls,
          photoGroups: record.submission_metadata?.photoGroups,
          text: record.text_content,
          amount: record.submission_metadata?.amount
        }
      }))
    } catch (error) {
      console.error('[DutyManagerPersistence] Failed to fetch submissions:', error)
      return []
    }
  }

  // 获取当前的触发状态
  async getCurrentTrigger(restaurantId: string): Promise<DutyManagerTrigger | null> {
    try {
      // Validate restaurant ID to prevent UUID errors
      if (!restaurantId || restaurantId.trim() === '') {
        console.log('[DutyManagerPersistence] No restaurant ID provided, skipping trigger fetch')
        return null
      }
      
      const today = (getCurrentTestTime() || new Date()).toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('roleplay_task_records')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('date', today)
        .eq('submission_type', 'trigger')
        .like('task_id', 'trigger-%')
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) throw error
      if (!data || data.length === 0) return null

      const record = data[0]
      return {
        type: record.submission_metadata.triggerType,
        triggeredAt: new Date(record.submission_metadata.triggeredAt),
        triggeredBy: record.submission_metadata.triggeredBy
      }
    } catch (error) {
      console.error('[DutyManagerPersistence] Failed to fetch trigger:', error)
      return null
    }
  }

  // 更新审核状态
  async updateReviewStatus(
    taskId: string, 
    status: 'approved' | 'rejected', 
    reviewerId: string,
    reason?: string
  ) {
    try {
      const today = (getCurrentTestTime() || new Date()).toISOString().split('T')[0]
      
      console.log('[DutyManagerPersistence] Updating review status:', {
        taskId,
        status,
        reviewerId,
        date: today
      })
      
      // First check if the record exists - get the latest one
      const { data: existingRecords, error: checkError } = await supabase
        .from('roleplay_task_records')
        .select('*')
        .eq('task_id', taskId)
        .eq('date', today)
        .order('created_at', { ascending: false })
        .limit(1)
        
      if (checkError || !existingRecords || existingRecords.length === 0) {
        console.error('[DutyManagerPersistence] Record not found:', checkError)
        throw checkError || new Error('No record found')
      }
      
      const existingRecord = existingRecords[0]
      console.log('[DutyManagerPersistence] Found record:', existingRecord)
      
      const { data, error } = await supabase
        .from('roleplay_task_records')
        .update({
          review_status: status,
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
          reject_reason: reason
        })
        .eq('id', existingRecord.id)  // 使用具体的记录ID，避免更新多条记录
        .eq('status', 'submitted')
        .select()

      if (error) throw error
      console.log('[DutyManagerPersistence] Review status updated successfully:', data)
    } catch (error) {
      console.error('[DutyManagerPersistence] Failed to update review status:', error)
      throw error
    }
  }

  // 清除当天的所有值班经理任务（完成收尾工作时调用）
  async clearDailySubmissions(restaurantId: string) {
    try {
      const today = (getCurrentTestTime() || new Date()).toISOString().split('T')[0]
      
      // 注意：不再自动批准任务！
      // 这个方法只应该清理触发器和相关状态，不应该修改任务的审核状态
      // 任务的审核应该由管理员手动完成
      
      // 可以在这里清除触发器记录
      const { error } = await supabase
        .from('roleplay_task_records')
        .delete()
        .eq('restaurant_id', restaurantId)
        .eq('date', today)
        .like('task_id', 'trigger-%')

      if (error) throw error
      console.log('[DutyManagerPersistence] Daily triggers cleared')
    } catch (error) {
      console.error('[DutyManagerPersistence] Failed to clear triggers:', error)
      throw error
    }
  }
}

export const dutyManagerPersistence = new DutyManagerPersistenceService()