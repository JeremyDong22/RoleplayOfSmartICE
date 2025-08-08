// 任务汇总服务 - 从数据库实时获取任务统计信息
// Created: 2025-07-31
// 用于替代localStorage读取任务完成状态，支持多设备同步
// Updated: 2025-08-02 - Added test time support for date queries

import { supabase } from './supabase'
import { getCurrentTestTime } from '../utils/globalTestTime'
import { getLocalDateString } from '../utils/dateFormat'
import { isClosingPeriod } from '../utils/periodHelpers'

export interface TaskSummaryStats {
  currentPeriodTasks: {
    total: number
    completed: number
    pending: number
  }
  previousPeriodsMissing: {
    periodId: string
    periodName: string
    taskId: string
    taskTitle: string
    taskDescription: string
    submissionType: string | null
    uploadRequirement?: string | null
  }[]
  overallCompletionRate: number
  completedTaskIds: string[]
}

/**
 * 获取任务汇总统计信息
 * @param userId 用户ID
 * @param restaurantId 餐厅ID
 * @param role 角色 (manager/chef)
 * @param currentTime 当前时间（用于测试）
 */
export async function getTaskSummaryStats(
  userId: string,
  restaurantId: string,
  role: 'manager' | 'chef' | 'duty_manager',
  currentTime?: Date
): Promise<TaskSummaryStats> {
  const now = currentTime || new Date()
  // 使用统一的日期格式化函数
  const today = getLocalDateString(now)
  
  try {
    // 1. 获取今天所有已提交/完成的任务记录
    const { data: taskRecords, error: recordsError } = await supabase
      .from('roleplay_task_records')
      .select(`
        id,
        task_id,
        status,
        review_status,
        period_id,
        created_at
      `)
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .eq('date', today)
      .in('status', ['submitted', 'completed'])
    
    if (recordsError) throw recordsError
    
    // 1.5 如果是Manager，还需要获取值班经理的任务审核状态
    let dutyManagerReviewedTasks: string[] = []
    if (role === 'manager') {
      // 获取同餐厅值班经理今天的任务记录
      const { data: dutyRecords, error: dutyError } = await supabase
        .from('roleplay_task_records')
        .select(`
          task_id,
          review_status,
          roleplay_tasks!inner (
            id,
            role_code
          )
        `)
        .eq('restaurant_id', restaurantId)
        .eq('date', today)
        .eq('roleplay_tasks.role_code', 'duty_manager')
        .eq('review_status', 'approved')
      
      if (dutyError) {
        console.error('Error fetching duty manager records:', dutyError)
      } else if (dutyRecords) {
        // 收集所有已被审核通过的值班经理任务ID
        dutyManagerReviewedTasks = dutyRecords.map(r => r.task_id)
      }
    }
    
    // 2. 获取所有任务定义
    // 直接使用传入的 role 参数，它应该已经是正确的值（'manager', 'chef', 或 'duty_manager'）
    // Updated: 2025-08-04 - Fetch restaurant-specific tasks
    const { data: taskDefs, error: defsError } = await supabase
      .from('roleplay_tasks')
      .select('id, title, description, period_id, role_code, is_notice, is_floating, submission_type')
      .eq('restaurant_id', restaurantId)
      .eq('role_code', role)
    
    if (defsError) throw defsError
    
    // 3. 创建任务ID到定义的映射
    const taskDefMap = new Map(taskDefs.map(t => [t.id, t]))
    
    // 4. 获取已完成的任务ID列表（排除被拒绝的）
    const completedTaskIds = taskRecords
      .filter(r => r.review_status !== 'rejected')
      .map(r => r.task_id)
    
    // 4.5 对于Manager，审核任务的完成状态基于值班经理任务是否已被审核
    const effectiveCompletedTaskIds = [...completedTaskIds]
    if (role === 'manager') {
      // 查找所有审核任务
      const reviewTasks = taskDefs.filter(t => t.title.includes('审核'))
      
      // 获取所有值班经理任务以建立映射
      const { data: dutyTasks } = await supabase
        .from('roleplay_tasks')
        .select('id, title')
        .eq('role_code', 'duty_manager')
      
      if (dutyTasks && reviewTasks.length > 0) {
        // 对于每个审核任务，检查对应的值班经理任务是否已被审核
        for (const reviewTask of reviewTasks) {
          // 查找审核任务对应的值班经理任务
          const linkedTaskTitle = reviewTask.title.replace('审核', '').trim()
          const linkedTask = dutyTasks.find(dt => dt.title.includes(linkedTaskTitle))
          
          if (linkedTask && dutyManagerReviewedTasks.includes(linkedTask.id)) {
            // 如果对应的值班经理任务已被审核，则审核任务算作已完成
            if (!effectiveCompletedTaskIds.includes(reviewTask.id)) {
              effectiveCompletedTaskIds.push(reviewTask.id)
            }
          }
        }
      }
    }
    
    // 5. 从数据库获取期间数据
    // Updated: 2025-08-04 - Added restaurant-specific period fetching
    const { data: workflowPeriods, error: periodsError } = await supabase
      .from('roleplay_workflow_periods')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('display_order')
    
    if (periodsError) {
      console.error('Error fetching workflow periods:', periodsError)
      throw periodsError
    }
    
    // 直接使用本地时间计算当前时段（在中国就是北京时间）
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTimeInMinutes = currentHour * 60 + currentMinute
    
    const currentPeriod = workflowPeriods?.find(p => {
      const [startHour, startMinute] = p.start_time.split(':').map(Number)
      const [endHour, endMinute] = p.end_time.split(':').map(Number)
      const startInMinutes = startHour * 60 + startMinute
      const endInMinutes = endHour * 60 + endMinute
      
      if (endInMinutes < startInMinutes) {
        if (currentTimeInMinutes >= startInMinutes || currentTimeInMinutes < endInMinutes) {
          return true
        }
      } else {
        if (currentTimeInMinutes >= startInMinutes && currentTimeInMinutes < endInMinutes) {
          return true
        }
      }
      return false
    })
    
    const currentPeriodStats = {
      total: 0,
      completed: 0,
      pending: 0
    }
    
    if (currentPeriod) {
      // 获取当前时段的任务（排除通知和浮动任务）
      const currentPeriodTasks = taskDefs.filter(t => 
        t.period_id === currentPeriod.id && 
        !t.is_notice && 
        !t.is_floating
      )
      
      currentPeriodStats.total = currentPeriodTasks.length
      currentPeriodStats.completed = currentPeriodTasks.filter(t => 
        effectiveCompletedTaskIds.includes(t.id)
      ).length
      currentPeriodStats.pending = currentPeriodStats.total - currentPeriodStats.completed
    }
    
    // 6. 计算之前时段的缺失任务
    const missingTasks: TaskSummaryStats['previousPeriodsMissing'] = []
    
    workflowPeriods.forEach(period => {
      // 检查时段是否已经开始
      const [startHour, startMinute] = period.start_time.split(':').map(Number)
      const [endHour, endMinute] = period.end_time.split(':').map(Number)
      const periodStartMinutes = startHour * 60 + startMinute
      const periodEndMinutes = endHour * 60 + endMinute
      
      // 判断时段是否已经结束
      let periodEnded = false
      if (period.id !== currentPeriod?.id) {
        if (periodEndMinutes > periodStartMinutes) {
          // 同一天的时段（如 10:00-14:00）
          periodEnded = currentTimeInMinutes >= periodEndMinutes
        } else {
          // 跨日时段（如 closing: 21:30-08:00）
          // 时段结束的条件：当前时间在凌晨且已过结束时间（08:00）
          if (currentTimeInMinutes < periodEndMinutes) {
            // 凌晨时间（00:00-08:00），closing时段可能已结束
            periodEnded = true
          } else if (currentTimeInMinutes < periodStartMinutes) {
            // 白天时间（08:00-21:30），closing时段还未开始
            periodEnded = false
          } else {
            // 晚上时间（21:30-24:00），closing时段进行中
            periodEnded = false
          }
        }
      }
      
      // 只检查已经结束且不是当前时段的时段
      if (periodEnded && period.id !== currentPeriod?.id) {
        // 跳过厨师的收尾时段
        if (role === 'chef' && isClosingPeriod(period)) return
        
        // 获取该时段的任务
        const periodTasks = taskDefs.filter(t => 
          t.period_id === period.id && 
          !t.is_notice && 
          !t.is_floating
        )
        
        // 找出未完成的任务
        periodTasks.forEach(task => {
          if (!effectiveCompletedTaskIds.includes(task.id)) {
            missingTasks.push({
              periodId: period.id,
              periodName: period.display_name,
              taskId: task.id,
              taskTitle: task.title,
              taskDescription: task.description || '',
              submissionType: task.submission_type,
              uploadRequirement: null // 从数据库已经有 submission_type，不需要额外的 uploadRequirement
            })
          }
        })
      }
    })
    
    // 7. 计算总体完成率
    let totalTasksDue = 0
    let totalTasksCompleted = 0
    
    workflowPeriods.forEach(period => {
      const [startHour, startMinute] = period.start_time.split(':').map(Number)
      const [endHour, endMinute] = period.end_time.split(':').map(Number)
      const periodStartMinutes = startHour * 60 + startMinute
      const periodEndMinutes = endHour * 60 + endMinute
      
      // 判断时段是否已经开始或已经结束
      let periodStarted = false
      if (period.id === currentPeriod?.id) {
        periodStarted = true // 当前时段算作已开始
      } else {
        // 判断时段是否已经结束
        if (periodEndMinutes > periodStartMinutes) {
          // 同一天的时段
          periodStarted = currentTimeInMinutes >= periodEndMinutes
        } else {
          // 跨日时段（如 closing: 21:30-08:00）
          if (currentTimeInMinutes < periodEndMinutes) {
            // 凌晨时间（00:00-08:00），closing时段可能已结束
            periodStarted = true
          } else {
            // 其他时间，closing时段还未结束
            periodStarted = false
          }
        }
      }
      
      // 包含已结束的时段和当前时段
      if (periodStarted && !(role === 'chef' && isClosingPeriod(period))) {
        
        const periodTasks = taskDefs.filter(t => 
          t.period_id === period.id && 
          !t.is_notice && 
          !t.is_floating
        )
        
        totalTasksDue += periodTasks.length
        totalTasksCompleted += periodTasks.filter(t => 
          effectiveCompletedTaskIds.includes(t.id)
        ).length
      }
    })
    
    const overallCompletionRate = totalTasksDue > 0 
      ? Math.round((totalTasksCompleted / totalTasksDue) * 100)
      : 100
    
    return {
      currentPeriodTasks: currentPeriodStats,
      previousPeriodsMissing: missingTasks,
      overallCompletionRate,
      completedTaskIds: effectiveCompletedTaskIds
    }
    
  } catch (error) {
    console.error('Error fetching task summary stats:', error)
    throw error
  }
}

/**
 * 订阅任务状态变化
 * @param userId 用户ID
 * @param restaurantId 餐厅ID
 * @param callback 状态变化回调
 */
export function subscribeToTaskStats(
  userId: string,
  restaurantId: string,
  callback: (stats: TaskSummaryStats) => void
) {
  const channel = supabase
    .channel(`task-stats-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'roleplay_task_records',
        filter: `user_id=eq.${userId}`
      },
      async () => {
        // 当任务记录变化时，重新获取统计信息
        try {
          const role = localStorage.getItem('selectedRole') as 'manager' | 'chef'
          const stats = await getTaskSummaryStats(userId, restaurantId, role)
          callback(stats)
        } catch (error) {
          console.error('Error updating task stats:', error)
        }
      }
    )
    .subscribe()
  
  // 返回取消订阅函数
  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * 获取特定时段的任务完成详情
 * @param userId 用户ID
 * @param restaurantId 餐厅ID
 * @param periodId 时段ID
 */
export async function getPeriodTaskDetails(
  userId: string,
  restaurantId: string,
  periodId: string
) {
  const testTime = getCurrentTestTime()
  const now = testTime || new Date()
  // 使用统一的日期格式化函数
  const today = getLocalDateString(now)
  
  const { data, error } = await supabase
    .from('roleplay_task_records')
    .select(`
      id,
      task_id,
      status,
      review_status,
      submission_type,
      text_content,
      photo_urls,
      audio_url,
      created_at,
      roleplay_tasks!inner (
        title,
        description,
        upload_requirement
      )
    `)
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId)
    .eq('date', today)
    .eq('period_id', periodId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}