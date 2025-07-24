// 任务记录服务 - 处理与roleplay_task_records表的交互
// Created: 2025-07-23
// 负责任务提交、审核、查询等数据库操作

import { supabase } from './supabase'

export interface TaskRecord {
  id?: string
  user_id: string
  restaurant_id: string
  task_id: string
  date: string
  period_id: string
  status: 'pending' | 'in_progress' | 'submitted' | 'completed' | 'rejected'
  submission_type?: 'photo' | 'text' | 'audio' | 'list'
  text_content?: string
  photo_urls?: string[]
  audio_url?: string
  submission_metadata?: any
  review_status?: 'pending' | 'approved' | 'rejected'
  reviewed_by?: string
  reviewed_at?: string
  reject_reason?: string
}

// 提交任务（包括值班经理任务）
export async function submitTaskRecord(taskData: Partial<TaskRecord>) {
  const { data: user } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const record: Partial<TaskRecord> = {
    ...taskData,
    user_id: user.user.id,
    status: 'submitted',
    review_status: taskData.task_id?.includes('duty-manager') ? 'pending' : undefined,
    created_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('roleplay_task_records')
    .insert(record)
    .select()
    .single()

  if (error) throw error
  return data
}

// 审核任务（店长审核值班经理任务）
export async function reviewTaskRecord(
  recordId: string,
  decision: 'approved' | 'rejected',
  rejectReason?: string
) {
  const { data: user } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData: Partial<TaskRecord> = {
    review_status: decision,
    reviewed_by: user.user.id,  // 店长ID
    reviewed_at: new Date().toISOString(),
    status: decision === 'approved' ? 'completed' : 'rejected'
  }

  if (decision === 'rejected' && rejectReason) {
    updateData.reject_reason = rejectReason
  }

  const { data, error } = await supabase
    .from('roleplay_task_records')
    .update(updateData)
    .eq('id', recordId)
    .select()
    .single()

  if (error) throw error
  return data
}

// 重新提交被驳回的任务
export async function resubmitTaskRecord(
  originalRecordId: string,
  newData: Partial<TaskRecord>
) {
  // 获取原记录
  const { data: original } = await supabase
    .from('roleplay_task_records')
    .select('*')
    .eq('id', originalRecordId)
    .single()

  if (!original) throw new Error('Original record not found')

  // 创建新的提交记录（保留原记录）
  const newRecord = {
    ...original,
    ...newData,
    id: undefined, // 生成新ID
    status: 'submitted',
    review_status: 'pending',
    reject_reason: null,
    reviewed_by: null,
    reviewed_at: null,
    created_at: new Date().toISOString()
  }

  return submitTaskRecord(newRecord)
}

// 查询任务记录
export async function getTaskRecords(filters: {
  date?: string
  user_id?: string
  status?: string
  review_status?: string
}) {
  let query = supabase.from('roleplay_task_records').select('*')

  if (filters.date) {
    query = query.eq('date', filters.date)
  }
  if (filters.user_id) {
    query = query.eq('user_id', filters.user_id)
  }
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.review_status) {
    query = query.eq('review_status', filters.review_status)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// 获取今日已完成的任务ID列表
export async function getTodayCompletedTaskIds(userId: string): Promise<string[]> {
  const today = new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('roleplay_task_records')
    .select('task_id')
    .eq('user_id', userId)
    .eq('date', today)
    .in('status', ['submitted', 'completed'])

  if (error) {
    console.error('Error fetching today completed tasks:', error)
    return []
  }

  return data?.map(record => record.task_id) || []
}

// 获取指定日期范围内的已完成任务
export async function getCompletedTasksInRange(
  userId: string, 
  startDate: string, 
  endDate: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('roleplay_task_records')
    .select('task_id')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .in('status', ['submitted', 'completed'])

  if (error) {
    console.error('Error fetching completed tasks in range:', error)
    return []
  }

  return data?.map(record => record.task_id) || []
}

// 获取待审核的值班经理任务
export async function getPendingDutyTasks(restaurantId: string) {
  const { data, error } = await supabase
    .from('roleplay_task_records')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('review_status', 'pending')
    .like('task_id', '%duty-manager%')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// 上传媒体文件并返回URL
export async function uploadTaskMedia(
  file: File,
  taskId: string,
  type: 'photo' | 'audio' | 'document'
) {
  const date = new Date().toISOString().split('T')[0]
  const timestamp = Date.now()
  const ext = file.name.split('.').pop()
  
  let folder = ''
  switch (type) {
    case 'photo':
      folder = 'photos'
      break
    case 'audio':
      folder = 'audio'
      break
    case 'document':
      folder = 'documents'
      break
  }

  const path = `${folder}/${date}/${taskId}_${timestamp}.${ext}`

  const { data, error } = await supabase.storage
    .from('RolePlay')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) throw error

  // 获取公开URL
  const { data: { publicUrl } } = supabase.storage
    .from('RolePlay')
    .getPublicUrl(path)

  return publicUrl
}