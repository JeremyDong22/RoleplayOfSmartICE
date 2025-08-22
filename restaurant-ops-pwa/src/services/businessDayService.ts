// 营业日服务 - 从数据库动态获取营业日切换时间
// Created: 2025-08-22
// 用于替代硬编码的8小时判断，从数据库最后一个时段的结束时间推导营业日切换点

import { supabase } from './supabase'

// 缓存营业日切换时间，避免频繁查询数据库
let cachedCutoffHour: number | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 60 * 60 * 1000 // 1小时缓存

/**
 * 获取营业日切换小时数
 * 从数据库中查找跨日时段（结束时间小于开始时间）的结束时间
 * @param restaurantId 餐厅ID
 * @returns 营业日切换的小时数（默认8点）
 */
export async function getBusinessDayCutoffHour(restaurantId: string): Promise<number> {
  // 检查缓存
  if (cachedCutoffHour !== null && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedCutoffHour
  }

  try {
    // 查询所有时段，找到跨日时段
    const { data: periods, error } = await supabase
      .from('roleplay_workflow_periods')
      .select('start_time, end_time')
      .eq('restaurant_id', restaurantId)
      .order('display_order', { ascending: false })
      .limit(1) // 获取最后一个时段

    if (error) throw error

    if (periods && periods.length > 0) {
      const lastPeriod = periods[0]
      const startHour = parseInt(lastPeriod.start_time.split(':')[0])
      const endHour = parseInt(lastPeriod.end_time.split(':')[0])
      
      // 如果是跨日时段（结束时间小于开始时间）
      if (endHour < startHour) {
        // 使用结束时间作为营业日切换点
        cachedCutoffHour = endHour
        cacheTimestamp = Date.now()
        return endHour
      }
    }
    
    // 默认返回8点（向后兼容）
    cachedCutoffHour = 8
    cacheTimestamp = Date.now()
    return 8
    
  } catch (error) {
    console.error('Error fetching business day cutoff hour:', error)
    // 发生错误时返回默认值
    return 8
  }
}

/**
 * 清除缓存（在时段更新时调用）
 */
export function clearBusinessDayCutoffCache() {
  cachedCutoffHour = null
  cacheTimestamp = 0
}

/**
 * 获取营业日期
 * 根据数据库配置的切换时间判断当前时间属于哪个营业日
 * @param date 日期对象
 * @param restaurantId 餐厅ID
 * @returns YYYY-MM-DD格式的营业日期
 */
export async function getBusinessDateAsync(date: Date | undefined, restaurantId: string): Promise<string> {
  const d = date || new Date()
  const hours = d.getHours()
  
  // 获取营业日切换时间
  const cutoffHour = await getBusinessDayCutoffHour(restaurantId)
  
  // 如果当前时间小于切换时间，算作前一天
  if (hours < cutoffHour) {
    const yesterday = new Date(d)
    yesterday.setDate(yesterday.getDate() - 1)
    return formatDateString(yesterday)
  }
  
  return formatDateString(d)
}

/**
 * 格式化日期为YYYY-MM-DD
 */
function formatDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}