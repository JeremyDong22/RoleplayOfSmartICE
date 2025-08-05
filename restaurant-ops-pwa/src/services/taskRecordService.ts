// 任务记录服务 - 处理与roleplay_task_records表的交互
// Created: 2025-07-23
// 负责任务提交、审核、查询等数据库操作
// Updated: 2025-08-02 - Added test time support for date queries

import { supabase } from './supabase'
import { canCloseBusinessCycle, getBusinessCycleTaskCompletion } from './businessCycleService'
import { getCurrentTestTime } from '../utils/globalTestTime'
import { getLocalDateString } from '../utils/dateFormat'

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
  console.log('[TaskRecordService] submitTaskRecord called with:', taskData);
  
  // Check if user_id is already provided in taskData
  if (!taskData.user_id) {
    throw new Error('user_id is required in taskData')
  }

  // 获取用户角色信息
  const { data: userData } = await supabase
    .from('roleplay_users')
    .select(`
      id,
      roleplay_roles!inner (
        role_code
      )
    `)
    .eq('id', taskData.user_id)
    .single()

  const userRoleCode = userData?.roleplay_roles?.role_code
  
  const record: Partial<TaskRecord> = {
    ...taskData,
    status: 'submitted',
    // Manager任务自动approved，duty-manager任务需要审核
    review_status: userRoleCode === 'manager' ? 'approved' : 
                   taskData.task_id?.includes('duty-manager') ? 'pending' : undefined,
    created_at: new Date().toISOString()
  }
  
  // 如果是Manager任务且自动approved，设置审核信息
  if (userRoleCode === 'manager' && record.review_status === 'approved') {
    record.reviewed_by = taskData.user_id
    record.reviewed_at = new Date().toISOString()
  }
  
  console.log('[TaskRecordService] Inserting record:', record);

  const { data, error } = await supabase
    .from('roleplay_task_records')
    .insert(record)
    .select()
    .single()

  if (error) {
    console.error('[TaskRecordService] Database insert error:', error);
    throw error
  }
  
  console.log('[TaskRecordService] Insert successful:', data);
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
  const testTime = getCurrentTestTime()
  const today = (testTime || new Date()).toISOString().split('T')[0]
  
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

// 获取今日已审核通过的值班经理任务（用于判断审核任务是否完成）
export async function getTodayApprovedDutyManagerTasks(restaurantId: string): Promise<string[]> {
  const testTime = getCurrentTestTime()
  const today = (testTime || new Date()).toISOString().split('T')[0]
  
  
  const { data, error } = await supabase
    .from('roleplay_task_records')
    .select('task_id, review_status, reviewed_at')
    .eq('restaurant_id', restaurantId)
    .eq('date', today)
    .eq('review_status', 'approved')
    .like('task_id', '%duty-manager%')

  if (error) {
    console.error('Error fetching approved duty manager tasks:', error)
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
  const testTime = getCurrentTestTime()
  const date = (testTime || new Date()).toISOString().split('T')[0]
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

// 获取今日的任务状态详情（用于任务汇总）
export interface TaskStatusDetail {
  taskId: string
  completed: boolean
  completedAt?: Date
  overdue: boolean
  submissionType?: string
  reviewStatus?: string
}

export async function getTodayTaskStatuses(userId: string): Promise<TaskStatusDetail[]> {
  const testTime = getCurrentTestTime()
  const today = (testTime || new Date()).toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('roleplay_task_records')
    .select('task_id, status, created_at, submission_type, review_status')
    .eq('user_id', userId)
    .eq('date', today)
  
  if (error) {
    console.error('Error fetching task statuses:', error)
    return []
  }
  
  // Convert to TaskStatusDetail format
  return data?.map(record => ({
    taskId: record.task_id,
    completed: record.status === 'submitted' || record.status === 'completed',
    completedAt: record.created_at ? new Date(record.created_at) : undefined,
    overdue: false, // This needs to be calculated based on task period
    submissionType: record.submission_type,
    reviewStatus: record.review_status
  })) || []
}

// 验证是否可以闭店
export async function validateCanClose(restaurantId: string): Promise<{ canClose: boolean; reason?: string }> {
  const testTime = getCurrentTestTime()
  const today = (testTime || new Date()).toISOString().split('T')[0]
  return canCloseBusinessCycle(restaurantId, today)
}

// 获取实时的任务完成率（基于数据库）
export async function getRealTimeCompletionRate(restaurantId: string, role?: 'manager' | 'chef' | 'duty_manager'): Promise<{
  totalTasks: number
  completedTasks: number
  completionRate: number
  missingTasks: Array<{ id: string; title: string; role: string; period: string; periodName?: string; samples?: any[] }>
  currentPeriodTasks: {
    pending: Array<{ id: string; title: string; description?: string }>
    completed: Array<{ id: string; title: string; completedAt?: string }>
  }
}> {
  const testTime = getCurrentTestTime()
  const now = testTime || new Date()
  // 使用统一的日期格式化函数
  const today = getLocalDateString(now)
  
  // 直接使用本地时间计算当前时段（在中国就是北京时间）
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentTimeInMinutes = currentHour * 60 + currentMinute
  
  try {
    // 1. 获取餐厅特定的期间定义
    // Updated: 2025-08-04 - Fetch restaurant-specific periods
    const { data: periods } = await supabase
      .from('roleplay_workflow_periods')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('display_order')
    
    // 2. 获取指定角色的所有任务（包含description和samples）
    // Updated: 2025-08-04 - Fetch restaurant-specific tasks
    let taskQuery = supabase
      .from('roleplay_tasks')
      .select('id, title, description, role_code, period_id, samples')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .eq('is_notice', false)
      .not('is_floating', 'eq', true)
    
    if (role) {
      taskQuery = taskQuery.eq('role_code', role)
    } else {
      taskQuery = taskQuery.in('role_code', ['manager', 'chef', 'duty_manager'])
    }
    
    const { data: allTasks } = await taskQuery
    
    // 3. 获取今天已完成的任务（使用北京时间列）
    // 重要：需要过滤特定角色的任务，通过关联tasks表来获取role_code
    let completedQuery = supabase
      .from('roleplay_task_records')
      .select(`
        task_id, 
        created_at_beijing,
        roleplay_tasks!inner (
          role_code
        )
      `)
      .eq('restaurant_id', restaurantId)
      .eq('date', today)
      .eq('review_status', 'approved')
    
    // 只获取指定角色的已完成任务
    if (role) {
      completedQuery = completedQuery.eq('roleplay_tasks.role_code', role)
    } else {
      completedQuery = completedQuery.in('roleplay_tasks.role_code', ['manager', 'chef', 'duty_manager'])
    }
    
    const { data: completedRecords } = await completedQuery
    
    const completedTaskMap = new Map(completedRecords?.map(r => [r.task_id, r.created_at_beijing]) || [])
    const completedTaskIds = new Set(completedTaskMap.keys())
    
    // 4. 找出当前时段
    let currentPeriod = null
    for (const period of periods || []) {
      const [startHour, startMinute] = period.start_time.split(':').map(Number)
      const [endHour, endMinute] = period.end_time.split(':').map(Number)
      const startInMinutes = startHour * 60 + startMinute
      const endInMinutes = endHour * 60 + endMinute
      
      // 处理跨日情况
      if (endInMinutes < startInMinutes) {
        if (currentTimeInMinutes >= startInMinutes || currentTimeInMinutes < endInMinutes) {
          currentPeriod = period
          break
        }
      } else {
        if (currentTimeInMinutes >= startInMinutes && currentTimeInMinutes < endInMinutes) {
          currentPeriod = period
          break
        }
      }
    }
    
    // 5. 分类任务
    const missingTasks: Array<{ id: string; title: string; role: string; period: string; periodName?: string }> = []
    const currentPeriodPending: Array<{ id: string; title: string; description?: string }> = []
    const currentPeriodCompleted: Array<{ id: string; title: string; completedAt?: string }> = []
    let totalTasksDue = 0
    let totalTasksCompleted = 0
    
    // 对每个period检查
    for (const period of periods || []) {
      const [startHour, startMinute] = period.start_time.split(':').map(Number)
      const [endHour, endMinute] = period.end_time.split(':').map(Number)
      const startInMinutes = startHour * 60 + startMinute
      const endInMinutes = endHour * 60 + endMinute
      
      // 判断时段是否已经结束（对于之前的时段）
      let periodEnded = false
      if (period.id !== currentPeriod?.id) {
        // 如果不是当前时段，检查是否已经结束
        if (endInMinutes > startInMinutes) {
          // 同一天的时段（如 10:00-14:00）
          periodEnded = currentTimeInMinutes >= endInMinutes
        } else {
          // 跨日时段（如 closing: 21:30-08:00）
          // 时段结束的条件：当前时间在凌晨且已过结束时间（08:00）
          // 或者当前时间在前一天且已经是新的一天
          if (currentTimeInMinutes < endInMinutes) {
            // 凌晨时间（00:00-08:00），closing时段可能已结束
            periodEnded = true
          } else if (currentTimeInMinutes < startInMinutes) {
            // 白天时间（08:00-21:30），closing时段还未开始
            periodEnded = false
          } else {
            // 晚上时间（21:30-24:00），closing时段进行中
            periodEnded = false
          }
        }
      }
      
      // 判断时段是否已经开始
      const periodStarted = currentTimeInMinutes >= startInMinutes || 
                           (startInMinutes > 20 * 60 && currentTimeInMinutes < 4 * 60) // 处理跨日情况
      
      // 获取这个period的任务
      const periodTasks = (allTasks || []).filter(task => task.period_id === period.id)
      
      // 厨师跳过closing期间
      if (role === 'chef' && period.id === 'closing') {
        continue
      }
      
      // 对于所有角色，在新的一天开始时，检查跨日的closing期间
      // 动态判断基于实际的开始和结束时间
      if (period.id === 'closing' || period.display_name === '闭店') {
        // 如果是跨日的closing期间，且当前时间在新一天的开始（10:00）和closing开始时间之间
        const closingStartMinutes = startInMinutes
        if (endInMinutes < startInMinutes && currentTimeInMinutes >= 0 && currentTimeInMinutes < closingStartMinutes) {
          continue
        }
      }
      
      if (period.id === currentPeriod?.id) {
        // 当前时段：分类到待完成和已完成
        for (const task of periodTasks) {
          totalTasksDue++
          if (completedTaskIds.has(task.id)) {
            totalTasksCompleted++
            currentPeriodCompleted.push({
              id: task.id,
              title: task.title,
              completedAt: completedTaskMap.get(task.id)
            })
          } else {
            currentPeriodPending.push({
              id: task.id,
              title: task.title,
              description: task.description
            })
          }
        }
      } else if (periodEnded) {
        // 之前已结束的时段：统计缺失任务
        for (const task of periodTasks) {
          totalTasksDue++
          if (completedTaskIds.has(task.id)) {
            totalTasksCompleted++
          } else {
            missingTasks.push({
              id: task.id,
              title: task.title,
              role: task.role_code,
              period: task.period_id || '',
              periodName: period.display_name,
              samples: task.samples
            })
          }
        }
      }
      // 未开始的时段不计入统计
    }
    
    const completionRate = totalTasksDue > 0 
      ? Math.round((totalTasksCompleted / totalTasksDue) * 100)
      : 100
    
    // Debug logging removed to prevent console spam
    
    return {
      totalTasks: totalTasksDue,
      completedTasks: totalTasksCompleted,
      completionRate,
      missingTasks,
      currentPeriodTasks: {
        pending: currentPeriodPending,
        completed: currentPeriodCompleted
      }
    }
  } catch (error) {
    console.error('Error getting real-time completion rate:', error)
    return {
      totalTasks: 0,
      completedTasks: 0,
      completionRate: 0,
      missingTasks: [],
      currentPeriodTasks: {
        pending: [],
        completed: []
      }
    }
  }
}