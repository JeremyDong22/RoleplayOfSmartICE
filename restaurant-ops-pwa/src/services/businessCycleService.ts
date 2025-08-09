// 营业周期服务 - 处理跨日期的营业周期查询
// Created: 2025-07-31
// 负责处理从开店到闭店的完整营业周期内的任务完成情况查询
// Updated: 2025-08-02 - Added test time support for date queries

import { supabase } from './supabase'
import { restaurantConfigService } from './restaurantConfigService'
import { getCurrentTestTime } from '../utils/globalTestTime'
import { getLocalDateString } from '../utils/dateFormat'

// 营业时间将从数据库动态获取
interface BusinessHours {
  openingTime: string | null
  closingTime: string | null
}

interface TaskCompletionStatus {
  date: string
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  missingTasks: string[]
  completionRate: number
}

interface BusinessCycle {
  startTime: string
  endTime: string | null
  isOpen: boolean
}

/**
 * 从 roleplay_workflow_periods 获取营业时间
 * 使用第一个时段的开始时间作为开店时间
 * 使用最后一个时段的结束时间作为闭店时间
 * Updated: 2025-08-04 - Added restaurant-specific period fetching
 */
async function getBusinessHoursFromDatabase(restaurantId?: string): Promise<BusinessHours> {
  try {
    // Get restaurant ID if not provided
    const targetRestaurantId = restaurantId || await restaurantConfigService.getRestaurantId()
    
    if (!targetRestaurantId) {
      console.error('[BusinessCycleService] No restaurant ID available')
      return { openingTime: null, closingTime: null }
    }
    
    const { data: periods, error } = await supabase
      .from('roleplay_workflow_periods')
      .select('start_time, end_time, display_order')
      .eq('restaurant_id', targetRestaurantId)
      .order('display_order')
    
    if (error || !periods || periods.length === 0) {
      console.error('[BusinessCycleService] Failed to fetch periods:', error)
      return { openingTime: null, closingTime: null }
    }
    
    // 第一个时段的开始时间作为开店时间
    const openingTime = periods[0].start_time
    
    // 最后一个时段的结束时间作为闭店时间
    const lastPeriod = periods[periods.length - 1]
    const closingTime = lastPeriod.end_time
    
    return {
      openingTime: openingTime ? `${openingTime}` : null,
      closingTime: closingTime ? `${closingTime}` : null
    }
  } catch (error) {
    console.error('[BusinessCycleService] Error fetching business hours:', error)
    return { openingTime: null, closingTime: null }
  }
}

/**
 * 获取实际的营业周期
 * 由于不使用period_transitions表，返回null让系统使用默认时间
 */
export async function getActualBusinessCycle(
  restaurantId: string,
  date: string
): Promise<BusinessCycle | null> {
  // 不再使用period_transitions表，直接返回null
  return null
}

/**
 * 获取指定日期的营业周期范围
 * 优先使用实际记录，如果没有则使用默认时间
 */
export async function getBusinessCycleRange(
  restaurantId: string,
  date: string
): Promise<{ startTime: string; endTime: string }> {
  // 尝试获取实际的营业周期
  const actualCycle = await getActualBusinessCycle(restaurantId, date)
  
  if (actualCycle?.startTime && actualCycle?.endTime) {
    return {
      startTime: actualCycle.startTime,
      endTime: actualCycle.endTime
    }
  }
  
  // 如果没有完整的实际记录，从数据库获取营业时间
  const businessHours = await getBusinessHoursFromDatabase(restaurantId)
  
  // 使用数据库中的时间，如果没有则使用默认值
  const openingTime = businessHours.openingTime || '10:00:00'
  const closingTime = businessHours.closingTime || '22:30:00'
  
  const startDateTime = actualCycle?.startTime || `${date} ${openingTime}`
  
  // 如果闭店时间早于开店时间（跨日），则结束时间为第二天
  const [closingHour] = closingTime.split(':').map(Number)
  const [openingHour] = openingTime.split(':').map(Number)
  
  let endDateTime: string
  if (closingHour < openingHour) {
    // 跨日营业
    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)
    endDateTime = actualCycle?.endTime || `${nextDate.toISOString().split('T')[0]} ${closingTime}`
  } else {
    // 同日营业
    endDateTime = actualCycle?.endTime || `${date} ${closingTime}`
  }
  
  return {
    startTime: startDateTime,
    endTime: endDateTime
  }
}

/**
 * 查询某个营业周期内的所有任务完成情况
 */
export async function getBusinessCycleTaskCompletion(
  restaurantId: string,
  businessDate: string
): Promise<TaskCompletionStatus> {
  // 使用传入的businessDate或获取当前本地日期
  const testTime = getCurrentTestTime()
  const now = testTime || new Date()
  const dateToUse = businessDate || getLocalDateString(now)
  
  
  // 1. 获取所有需要完成的任务（Manager + DutyManager，排除 Chef）
  const { data: allTasks, error: tasksError } = await supabase
    .from('roleplay_tasks')
    .select('id, title, role_code, period_id')
    .in('role_code', ['manager', 'duty_manager'])  // 排除 chef
    .eq('is_active', true)
    .eq('is_notice', false)  // 排除通知类任务
    .not('is_floating', 'eq', true)  // 排除浮动任务

  if (tasksError) {
    console.error('Error fetching tasks:', tasksError)
    throw tasksError
  }

  // 2. 获取今天（UTC日期）所有已approved的任务
  const { data: completedRecords, error: recordsError } = await supabase
    .from('roleplay_task_records')
    .select('task_id, status, review_status')
    .eq('restaurant_id', restaurantId)
    .eq('date', dateToUse)  // 使用date列
    .eq('review_status', 'approved')

  if (recordsError) {
    console.error('Error fetching task records:', recordsError)
    throw recordsError
  }

  // 3. 计算完成情况
  const completedTaskIds = new Set(completedRecords?.map(r => r.task_id) || [])
  const missingTasks = allTasks?.filter(task => !completedTaskIds.has(task.id)) || []
  
  const totalTasks = allTasks?.length || 0
  // IMPORTANT: Only count completed tasks that are in the required task list
  const completedTasks = allTasks?.filter(task => completedTaskIds.has(task.id)).length || 0
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  return {
    date: dateToUse,
    totalTasks,
    completedTasks,
    pendingTasks: missingTasks.length,
    missingTasks: missingTasks.map(t => `${t.title} (${t.role_code})`),
    completionRate: Math.round(completionRate * 100) / 100
  }
}

/**
 * 检查某个营业周期是否可以闭店
 * 条件：所有Manager和DutyManager的任务都已approved（排除Chef任务）
 */
export async function canCloseBusinessCycle(
  restaurantId: string,
  businessDate?: string
): Promise<{ canClose: boolean; reason?: string }> {
  try {
    // 如果没有传入日期，使用当前本地日期
    const testTime = getCurrentTestTime()
    const now = testTime || new Date()
    const dateToUse = businessDate || getLocalDateString(now)
    
    const completion = await getBusinessCycleTaskCompletion(restaurantId, dateToUse)
    
    // Check pendingTasks instead of completionRate to avoid floating point issues
    if (completion.pendingTasks === 0) {
      return { canClose: true }
    } else {
      // 格式化未完成任务列表，使其更易读
      const formattedMissingTasks = completion.missingTasks
        .map((task, index) => `${index + 1}. ${task}`)
        .join('\n')
      
      return {
        canClose: false,
        reason: `还有 ${completion.pendingTasks} 个任务未完成:\n${formattedMissingTasks}`
      }
    }
  } catch (error) {
    console.error('[BusinessCycleService] 检查闭店条件时出错:', error)
    return {
      canClose: false,
      reason: '查询任务状态时出错，请重试'
    }
  }
}

/**
 * SQL查询示例 - 获取某个营业周期的任务统计
 * 这些是可以直接在Supabase SQL编辑器中使用的查询
 */
export const SQL_QUERIES = {
  // 查询某个营业周期的任务完成统计（使用默认营业时间）
  getBusinessCycleStats: `
    -- 使用默认营业周期时间
    WITH business_cycle AS (
      SELECT 
        '2025-07-31 10:00:00'::timestamp AS cycle_start,
        '2025-08-01 04:00:00'::timestamp AS cycle_end
    ),
    required_tasks AS (
      SELECT id, title, role_code
      FROM roleplay_tasks
      WHERE role_code IN ('manager', 'duty_manager')  -- 排除 chef
        AND is_active = true
        AND is_notice = false
        AND (is_floating IS NULL OR is_floating = false)
    ),
    completed_tasks AS (
      SELECT DISTINCT task_id
      FROM roleplay_task_records, business_cycle
      WHERE created_at >= business_cycle.cycle_start
        AND created_at <= business_cycle.cycle_end
        AND review_status = 'approved'
    )
    SELECT 
      (SELECT COUNT(*) FROM required_tasks) as total_tasks,
      (SELECT COUNT(*) FROM completed_tasks) as completed_tasks,
      (SELECT COUNT(*) FROM required_tasks) - (SELECT COUNT(*) FROM completed_tasks) as pending_tasks,
      ROUND(
        CASE 
          WHEN (SELECT COUNT(*) FROM required_tasks) = 0 THEN 100
          ELSE ((SELECT COUNT(*) FROM completed_tasks)::numeric / (SELECT COUNT(*) FROM required_tasks)) * 100
        END, 2
      ) as completion_rate
  `,

  // 查询未完成的任务详情
  getMissingTasks: `
    WITH business_cycle AS (
      SELECT 
        '2025-07-31 10:00:00'::timestamp AS cycle_start,
        '2025-08-01 04:00:00'::timestamp AS cycle_end
    ),
    completed_task_ids AS (
      SELECT DISTINCT task_id
      FROM roleplay_task_records, business_cycle
      WHERE created_at >= business_cycle.cycle_start
        AND created_at <= business_cycle.cycle_end
        AND review_status = 'approved'
    )
    SELECT t.id, t.title, t.role_code
    FROM roleplay_tasks t
    WHERE t.role_code IN ('manager', 'duty_manager')  -- 排除 chef
      AND t.is_active = true
      AND t.is_notice = false
      AND (t.is_floating IS NULL OR t.is_floating = false)
      AND t.id NOT IN (SELECT task_id FROM completed_task_ids)
    ORDER BY t.role_code, t.sort_order
  `,

  // 查询某天所有营业周期的任务记录
  getDailyTaskRecords: `
    SELECT 
      tr.task_id,
      t.title,
      t.role_code,
      tr.status,
      tr.review_status,
      tr.created_at,
      tr.reviewed_at,
      u.display_name as submitted_by,
      reviewer.display_name as reviewed_by
    FROM roleplay_task_records tr
    JOIN roleplay_tasks t ON tr.task_id = t.id
    JOIN roleplay_users u ON tr.user_id = u.id
    LEFT JOIN roleplay_users reviewer ON tr.reviewed_by = reviewer.id
    WHERE tr.created_at >= '2025-07-31 10:00:00'
      AND tr.created_at <= '2025-08-01 04:00:00'
      AND t.role_code IN ('manager', 'duty_manager')  -- 排除 chef
    ORDER BY tr.created_at
  `
}