// 任务汇总服务 - 从数据库实时获取任务统计信息
// Created: 2025-07-31
// 用于替代localStorage读取任务完成状态，支持多设备同步

import { supabase } from './supabase'
import { loadWorkflowPeriods, getCurrentPeriod } from '../utils/workflowParser'

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
  role: 'manager' | 'chef',
  currentTime?: Date
): Promise<TaskSummaryStats> {
  const now = currentTime || new Date()
  const today = now.toISOString().split('T')[0]
  
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
    
    // 2. 获取所有任务定义
    const { data: taskDefs, error: defsError } = await supabase
      .from('roleplay_tasks')
      .select('id, title, period_id, role_code, is_notice, is_floating')
      .eq('restaurant_id', restaurantId)
      .eq('role_code', role)
    
    if (defsError) throw defsError
    
    // 3. 创建任务ID到定义的映射
    const taskDefMap = new Map(taskDefs.map(t => [t.id, t]))
    
    // 4. 获取已完成的任务ID列表（排除被拒绝的）
    const completedTaskIds = taskRecords
      .filter(r => r.review_status !== 'rejected')
      .map(r => r.task_id)
    
    // 5. 计算当前时段的任务统计
    const workflowPeriods = loadWorkflowPeriods()
    const currentPeriod = getCurrentPeriod(now)
    
    let currentPeriodStats = {
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
        completedTaskIds.includes(t.id)
      ).length
      currentPeriodStats.pending = currentPeriodStats.total - currentPeriodStats.completed
    }
    
    // 6. 计算之前时段的缺失任务
    const missingTasks: TaskSummaryStats['previousPeriodsMissing'] = []
    
    workflowPeriods.forEach(period => {
      // 检查时段是否已经开始
      const [startHour, startMinute] = period.startTime.split(':').map(Number)
      const periodStart = new Date(now)
      periodStart.setHours(startHour, startMinute, 0, 0)
      
      // 只检查已经开始且不是当前时段的时段
      if (now >= periodStart && period.id !== currentPeriod?.id) {
        // 跳过厨师的收尾时段
        if (role === 'chef' && period.id === 'closing') return
        
        // 获取该时段的任务
        const periodTasks = taskDefs.filter(t => 
          t.period_id === period.id && 
          !t.is_notice && 
          !t.is_floating
        )
        
        // 找出未完成的任务
        periodTasks.forEach(task => {
          if (!completedTaskIds.includes(task.id)) {
            missingTasks.push({
              periodId: period.id,
              periodName: period.displayName,
              taskId: task.id,
              taskTitle: task.title
            })
          }
        })
      }
    })
    
    // 7. 计算总体完成率
    let totalTasksDue = 0
    let totalTasksCompleted = 0
    
    workflowPeriods.forEach(period => {
      const [startHour, startMinute] = period.startTime.split(':').map(Number)
      const periodStart = new Date(now)
      periodStart.setHours(startHour, startMinute, 0, 0)
      
      // 包含已开始的时段和当前时段
      if ((now >= periodStart || period.id === currentPeriod?.id) && 
          !(role === 'chef' && period.id === 'closing')) {
        
        const periodTasks = taskDefs.filter(t => 
          t.period_id === period.id && 
          !t.is_notice && 
          !t.is_floating
        )
        
        totalTasksDue += periodTasks.length
        totalTasksCompleted += periodTasks.filter(t => 
          completedTaskIds.includes(t.id)
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
      completedTaskIds
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
  const today = new Date().toISOString().split('T')[0]
  
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