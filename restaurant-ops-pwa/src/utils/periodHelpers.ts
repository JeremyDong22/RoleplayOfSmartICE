// Period helper functions to handle dynamic period IDs
// Created: 2025-08-08 - Replace hardcoded period ID checks with flexible logic

import type { WorkflowPeriod } from '../types/task.types'

/**
 * 检查是否为闭店时段
 * 只检查 period.name 是否等于 "收市与打烊"
 */
export function isClosingPeriod(period: WorkflowPeriod | null | undefined): boolean {
  if (!period) return false
  
  // 只检查名称是否为"收市与打烊"
  return period.name === '收市与打烊'
}

/**
 * 检查是否为预闭店时段
 * 预闭店通常在21:00-21:30
 */
export function isPreClosingPeriod(period: WorkflowPeriod | null | undefined): boolean {
  if (!period) return false
  
  // 1. 检查名称
  if (period.name?.includes('预闭店') || 
      period.name?.includes('餐后收市') ||
      period.displayName?.includes('预闭店') ||
      period.displayName?.includes('餐后收市')) {
    // 需要排除午市的餐后收市
    if (period.name?.includes('晚') || period.displayName?.includes('晚')) {
      return true
    }
  }
  
  // 2. 检查时间是否从21:00开始
  if (period.startTime === '21:00' || period.startTime === '21:00:00') {
    return true
  }
  
  // 3. 旧版兼容
  if (period.id === 'pre-closing') {
    return true
  }
  
  return false
}

/**
 * 检查是否为开店时段
 */
export function isOpeningPeriod(period: WorkflowPeriod | null | undefined): boolean {
  if (!period) return false
  
  // 1. 检查名称
  if (period.name?.includes('开店') || 
      period.displayName?.includes('开店')) {
    return true
  }
  
  // 2. 检查时间是否从10:00开始
  if (period.startTime === '10:00' || period.startTime === '10:00:00') {
    return true
  }
  
  // 3. 旧版兼容
  if (period.id === 'opening') {
    return true
  }
  
  return false
}

/**
 * 检查是否为午市收市时段
 * 午市收市通常在14:00-15:30
 */
export function isLunchClosingPeriod(period: WorkflowPeriod | null | undefined): boolean {
  if (!period) return false
  
  // 1. 检查名称
  if ((period.name?.includes('餐后收市') || 
       period.displayName?.includes('餐后收市')) &&
      (period.name?.includes('午市') || 
       period.displayName?.includes('午市'))) {
    return true
  }
  
  // 2. 检查时间是否从14:00开始
  if (period.startTime === '14:00' || period.startTime === '14:00:00') {
    return true
  }
  
  // 3. 旧版兼容
  if (period.id === 'lunch-closing') {
    return true
  }
  
  return false
}

/**
 * 检查是否为最后一个时段（通常是闭店时段）
 */
export function isLastPeriod(period: WorkflowPeriod | null | undefined, allPeriods: WorkflowPeriod[]): boolean {
  if (!period || allPeriods.length === 0) return false
  
  const lastPeriod = allPeriods[allPeriods.length - 1]
  return period.id === lastPeriod.id
}