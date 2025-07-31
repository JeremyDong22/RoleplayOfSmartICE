// 营业周期服务 - 处理跨日期的营业周期查询
// Created: 2025-07-31
// 负责处理从开店到闭店的完整营业周期内的任务完成情况查询

import { supabase } from './supabase'

// 定义营业周期时间点
const BUSINESS_HOURS = {
  OPENING_TIME: '10:00:00',  // 开店时间
  CLOSING_TIME: '22:30:00'   // 闭店时间
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
 * 获取实际的营业周期（基于period_transitions表的记录）
 * 查找开店时间和闭店时间
 */
export async function getActualBusinessCycle(
  restaurantId: string,
  date: string
): Promise<BusinessCycle | null> {
  // 查找当天的开店记录（进入opening period）
  const { data: openingTransition } = await supabase
    .from('roleplay_period_transitions')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('date', date)
    .eq('period_id', 'opening')
    .eq('action', 'enter')
    .order('timestamp', { ascending: true })
    .limit(1)
    .single()

  if (!openingTransition) {
    // 没有开店记录
    return null
  }

  // 查找闭店记录（manual_close或进入waiting状态）
  const { data: closingTransitions } = await supabase
    .from('roleplay_period_transitions')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .gte('timestamp', openingTransition.timestamp)
    .lte('timestamp', `${date} 23:59:59`)
    .or('action.eq.manual_close,period_id.eq.waiting')
    .order('timestamp', { ascending: false })
    .limit(1)

  // 如果没有找到当天的闭店记录，查找第二天凌晨的记录
  let closingTransition = closingTransitions?.[0]
  if (!closingTransition) {
    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)
    const nextDateStr = nextDate.toISOString().split('T')[0]
    
    const { data: nextDayClosing } = await supabase
      .from('roleplay_period_transitions')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .gte('timestamp', openingTransition.timestamp)
      .lte('timestamp', `${nextDateStr} 04:00:00`)
      .or('action.eq.manual_close,period_id.eq.waiting')
      .order('timestamp', { ascending: false })
      .limit(1)
    
    closingTransition = nextDayClosing?.[0]
  }

  return {
    startTime: openingTransition.timestamp,
    endTime: closingTransition?.timestamp || null,
    isOpen: !closingTransition
  }
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
  
  // 如果没有完整的实际记录，使用默认时间范围
  const startDateTime = actualCycle?.startTime || `${date} ${BUSINESS_HOURS.OPENING_TIME}`
  
  // 假设最晚闭店时间是第二天凌晨4点
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + 1)
  const endDateTime = actualCycle?.endTime || `${nextDate.toISOString().split('T')[0]} 04:00:00`
  
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
  const { startTime, endTime } = await getBusinessCycleRange(restaurantId, businessDate)
  
  // 1. 获取所有需要完成的任务（Manager + DutyManager）
  const { data: allTasks, error: tasksError } = await supabase
    .from('roleplay_tasks')
    .select('id, title, role_code')
    .in('role_code', ['manager', 'duty_manager'])
    .eq('is_active', true)
    .eq('is_notice', false)  // 排除通知类任务
    .not('is_floating', 'eq', true)  // 排除浮动任务

  if (tasksError) {
    console.error('Error fetching tasks:', tasksError)
    throw tasksError
  }

  // 2. 获取该营业周期内所有已approved的任务
  const { data: completedRecords, error: recordsError } = await supabase
    .from('roleplay_task_records')
    .select('task_id, status, review_status')
    .eq('restaurant_id', restaurantId)
    .gte('created_at', startTime)
    .lte('created_at', endTime)
    .eq('review_status', 'approved')

  if (recordsError) {
    console.error('Error fetching task records:', recordsError)
    throw recordsError
  }

  // 3. 计算完成情况
  const completedTaskIds = new Set(completedRecords?.map(r => r.task_id) || [])
  const missingTasks = allTasks?.filter(task => !completedTaskIds.has(task.id)) || []
  
  const totalTasks = allTasks?.length || 0
  const completedTasks = completedTaskIds.size
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  return {
    date: businessDate,
    totalTasks,
    completedTasks,
    pendingTasks: totalTasks - completedTasks,
    missingTasks: missingTasks.map(t => `${t.title} (${t.role_code})`),
    completionRate: Math.round(completionRate * 100) / 100
  }
}

/**
 * 检查某个营业周期是否可以闭店
 * 条件：所有Manager和DutyManager的任务都已approved
 */
export async function canCloseBusinessCycle(
  restaurantId: string,
  businessDate: string
): Promise<{ canClose: boolean; reason?: string }> {
  try {
    const completion = await getBusinessCycleTaskCompletion(restaurantId, businessDate)
    
    if (completion.completionRate === 100) {
      return { canClose: true }
    } else {
      return {
        canClose: false,
        reason: `还有 ${completion.pendingTasks} 个任务未完成: ${completion.missingTasks.join(', ')}`
      }
    }
  } catch {
    return {
      canClose: false,
      reason: '查询任务状态时出错'
    }
  }
}

/**
 * SQL查询示例 - 获取某个营业周期的任务统计
 * 这些是可以直接在Supabase SQL编辑器中使用的查询
 */
export const SQL_QUERIES = {
  // 查询某个营业周期的任务完成统计（需要先查询实际的营业周期时间）
  getBusinessCycleStats: `
    -- 首先运行这个查询获取实际营业周期
    WITH opening_time AS (
      SELECT timestamp as start_time
      FROM roleplay_period_transitions
      WHERE restaurant_id = '你的餐厅ID'
        AND date = '2025-07-31'
        AND period_id = 'opening'
        AND action = 'enter'
      ORDER BY timestamp ASC
      LIMIT 1
    ),
    closing_time AS (
      SELECT timestamp as end_time
      FROM roleplay_period_transitions
      WHERE restaurant_id = '你的餐厅ID'
        AND timestamp >= (SELECT start_time FROM opening_time)
        AND timestamp <= '2025-08-01 04:00:00'
        AND (action = 'manual_close' OR period_id = 'waiting')
      ORDER BY timestamp DESC
      LIMIT 1
    ),
    business_cycle AS (
      SELECT 
        COALESCE((SELECT start_time FROM opening_time), '2025-07-31 10:00:00'::timestamp) AS cycle_start,
        COALESCE((SELECT end_time FROM closing_time), '2025-08-01 04:00:00'::timestamp) AS cycle_end
    ),
    required_tasks AS (
      SELECT id, title, role_code
      FROM roleplay_tasks
      WHERE role_code IN ('manager', 'duty_manager')
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
    WHERE t.role_code IN ('manager', 'duty_manager')
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
      AND t.role_code IN ('manager', 'duty_manager')
    ORDER BY tr.created_at
  `
}