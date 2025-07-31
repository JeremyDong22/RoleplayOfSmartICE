// 营业周期辅助函数
// Created: 2025-07-31
// 提供营业周期相关的查询和验证功能

import { getActualBusinessCycle, getBusinessCycleTaskCompletion } from '../services/businessCycleService'
import { supabase } from '../services/supabase'

/**
 * 获取当前营业周期的状态
 */
export async function getCurrentBusinessCycleStatus(restaurantId: string) {
  const today = new Date().toISOString().split('T')[0]
  
  // 获取今天的营业周期
  const cycle = await getActualBusinessCycle(restaurantId, today)
  
  if (!cycle) {
    return {
      status: 'not_opened',
      message: '今天还未开店'
    }
  }
  
  if (cycle.isOpen) {
    return {
      status: 'open',
      message: '当前正在营业中',
      startTime: cycle.startTime
    }
  }
  
  return {
    status: 'closed',
    message: '今天已经闭店',
    startTime: cycle.startTime,
    endTime: cycle.endTime
  }
}

/**
 * 获取最近几天的营业周期统计
 */
export async function getRecentBusinessCycles(restaurantId: string, days: number = 7) {
  const results = []
  const today = new Date()
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    
    const cycle = await getActualBusinessCycle(restaurantId, dateStr)
    if (cycle?.startTime) {
      const completion = await getBusinessCycleTaskCompletion(restaurantId, dateStr)
      results.push({
        date: dateStr,
        ...cycle,
        ...completion
      })
    }
  }
  
  return results
}

/**
 * 验证当前是否在营业周期内
 */
export async function isInBusinessCycle(restaurantId: string): Promise<boolean> {
  const status = await getCurrentBusinessCycleStatus(restaurantId)
  return status.status === 'open'
}

/**
 * 获取用户在当前营业周期的任务完成情况
 */
export async function getUserBusinessCycleProgress(userId: string, restaurantId: string) {
  const today = new Date().toISOString().split('T')[0]
  const cycle = await getActualBusinessCycle(restaurantId, today)
  
  if (!cycle?.startTime) {
    return null
  }
  
  // 获取用户的角色
  const { data: userData } = await supabase
    .from('roleplay_users')
    .select('role_code')
    .eq('id', userId)
    .single()
  
  if (!userData) {
    return null
  }
  
  // 获取该角色的所有任务
  const { data: roleTasks } = await supabase
    .from('roleplay_tasks')
    .select('id, title')
    .eq('role_code', userData.role_code)
    .eq('is_active', true)
    .eq('is_notice', false)
    .not('is_floating', 'eq', true)
  
  // 获取已完成的任务
  const { data: completedRecords } = await supabase
    .from('roleplay_task_records')
    .select('task_id')
    .eq('user_id', userId)
    .gte('created_at', cycle.startTime)
    .lte('created_at', cycle.endTime || new Date().toISOString())
    .in('status', ['submitted', 'completed'])
  
  const completedTaskIds = new Set(completedRecords?.map(r => r.task_id) || [])
  const totalTasks = roleTasks?.length || 0
  const completedTasks = roleTasks?.filter(t => completedTaskIds.has(t.id)).length || 0
  
  return {
    role: userData.role_code,
    totalTasks,
    completedTasks,
    pendingTasks: totalTasks - completedTasks,
    completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    missingTasks: roleTasks?.filter(t => !completedTaskIds.has(t.id)).map(t => t.title) || []
  }
}