// 任务汇总服务 RPC 版本 - 使用数据库存储过程进行高效计算
// Created: 2025-09-16
// 使用 RPC 替代前端复杂计算，提升性能和安全性

import { supabase } from './supabase'

export interface TaskSummaryStatsRPC {
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
  }[]
  overallCompletionRate: number
  completedTaskIds: string[]
  currentPeriod: {
    id: string | null
    name: string | null
  }
}

/**
 * 通过 RPC 获取任务汇总统计信息
 * 所有复杂计算在数据库端完成，减少网络传输和前端负担
 * @param userId 用户ID
 * @param restaurantId 餐厅ID
 * @param role 角色 (manager/chef/duty_manager)
 * @param checkDate 检查日期（可选，默认今天）
 */
export async function getTaskSummaryStatsRPC(
  userId: string,
  restaurantId: string,
  role: 'manager' | 'chef' | 'duty_manager',
  checkDate?: string
): Promise<TaskSummaryStatsRPC> {
  try {
    // 调用数据库存储过程
    const { data, error } = await supabase.rpc('get_task_summary_stats', {
      p_user_id: userId,
      p_restaurant_id: restaurantId,
      p_role: role,
      p_check_date: checkDate || new Date().toISOString().split('T')[0]
    })

    if (error) {
      console.error('[TaskSummaryRPC] Error fetching stats:', error)
      throw error
    }

    // 数据已经是正确格式，直接返回
    return data as TaskSummaryStatsRPC
  } catch (error) {
    console.error('[TaskSummaryRPC] Unexpected error:', error)
    // 返回默认值以避免界面崩溃
    return {
      currentPeriodTasks: {
        total: 0,
        completed: 0,
        pending: 0
      },
      previousPeriodsMissing: [],
      overallCompletionRate: 0,
      completedTaskIds: [],
      currentPeriod: {
        id: null,
        name: null
      }
    }
  }
}

/**
 * 订阅任务汇总统计的实时更新
 * 当任务记录表有变化时，自动重新获取统计数据
 */
export function subscribeToTaskSummaryUpdates(
  userId: string,
  restaurantId: string,
  role: 'manager' | 'chef' | 'duty_manager',
  callback: (stats: TaskSummaryStatsRPC) => void
): () => void {
  // 初始加载
  getTaskSummaryStatsRPC(userId, restaurantId, role).then(callback)

  // 监听任务记录表的变化
  const channel = supabase
    .channel(`task-summary-${userId}-${restaurantId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'roleplay_task_records',
        filter: `restaurant_id=eq.${restaurantId}`
      },
      async () => {
        // 当有变化时，重新获取统计数据
        try {
          const stats = await getTaskSummaryStatsRPC(userId, restaurantId, role)
          callback(stats)
        } catch (error) {
          console.error('[TaskSummaryRPC] Error updating stats:', error)
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
 * 批量获取多个餐厅的任务汇总（CEO Dashboard 使用）
 * 可以创建另一个 RPC 函数来一次性获取多个餐厅的数据
 */
export async function getMultiRestaurantTaskSummary(
  restaurantIds: string[]
): Promise<Record<string, TaskSummaryStatsRPC>> {
  // TODO: 创建一个新的 RPC 函数 get_multi_restaurant_task_summary
  // 现在先用循环调用（后续可优化为单个 RPC）
  const results: Record<string, TaskSummaryStatsRPC> = {}

  await Promise.all(
    restaurantIds.map(async (restaurantId) => {
      try {
        // CEO 视角：获取所有角色的汇总数据
        const managerStats = await getTaskSummaryStatsRPC(
          '', // 不需要特定用户
          restaurantId,
          'manager'
        )
        results[restaurantId] = managerStats
      } catch (error) {
        console.error(`Error fetching stats for restaurant ${restaurantId}:`, error)
      }
    })
  )

  return results
}

/**
 * 获取实时完成率（简化版）
 * 如果只需要完成率，可以创建一个更轻量的 RPC
 */
export async function getCompletionRateRPC(
  restaurantId: string,
  role?: 'manager' | 'chef' | 'duty_manager'
): Promise<number> {
  try {
    // 可以创建一个专门的 get_completion_rate RPC 函数
    // 现在先用完整的统计数据
    const stats = await getTaskSummaryStatsRPC(
      '', // 不需要特定用户
      restaurantId,
      role || 'manager'
    )
    return stats.overallCompletionRate
  } catch (error) {
    console.error('[TaskSummaryRPC] Error fetching completion rate:', error)
    return 0
  }
}