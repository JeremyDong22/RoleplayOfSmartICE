/**
 * 餐厅状态服务
 * 负责从数据库获取餐厅的实时运营状态
 * Updated: 2025-08-02 - Added test time support for date queries
 */

import { supabase } from './supabase'
import { getCurrentTestTime } from '../utils/globalTestTime'

export interface RestaurantState {
  currentPeriodId: string | null
  isWaitingForNextDay: boolean
  isManualClosing: boolean
  canManualClose: boolean
}

export interface BusinessDayRange {
  businessDayStart: Date
  businessDayEnd: Date
}

class RestaurantStateService {
  /**
   * 获取餐厅当前状态
   * @param restaurantId 餐厅ID
   * @param testTime 测试时间（可选）
   */
  async getCurrentState(restaurantId: string, testTime?: Date): Promise<RestaurantState | null> {
    try {
      // Always pass both parameters to avoid function overloading issues
      const { data, error } = await supabase
        .rpc('get_restaurant_current_state', {
          p_restaurant_id: restaurantId,
          p_test_time: testTime ? testTime.toISOString() : null
        })

      if (error) {
        console.error('[RestaurantStateService] Error getting current state:', error)
        return null
      }

      if (!data || data.length === 0) {
        return null
      }

      const state = data[0]
      return {
        currentPeriodId: state.current_period_id,
        isWaitingForNextDay: state.is_waiting_for_next_day,
        isManualClosing: state.is_manual_closing,
        canManualClose: state.can_manual_close
      }
    } catch (error) {
      console.error('[RestaurantStateService] Unexpected error:', error)
      return null
    }
  }

  /**
   * 获取营业日时间范围
   */
  async getBusinessDayRange(date?: Date): Promise<BusinessDayRange | null> {
    try {
      const checkDate = date ? date.toISOString().split('T')[0] : undefined
      
      const { data, error } = await supabase
        .rpc('get_business_day_range', checkDate ? { p_date: checkDate } : {})

      if (error) {
        console.error('[RestaurantStateService] Error getting business day range:', error)
        return null
      }

      if (!data || data.length === 0) {
        return null
      }

      const range = data[0]
      return {
        businessDayStart: new Date(range.business_day_start),
        businessDayEnd: new Date(range.business_day_end)
      }
    } catch (error) {
      console.error('[RestaurantStateService] Unexpected error:', error)
      return null
    }
  }

  /**
   * 检查是否所有任务已完成
   */
  async checkAllTasksCompleted(restaurantId: string, date?: Date): Promise<boolean> {
    try {
      const checkDate = date ? date.toISOString().split('T')[0] : undefined
      
      const { data, error } = await supabase
        .rpc('check_business_day_tasks_completed', {
          p_restaurant_id: restaurantId,
          ...(checkDate && { p_check_date: checkDate })
        })

      if (error) {
        console.error('[RestaurantStateService] Error checking tasks:', error)
        return false
      }

      return data === true
    } catch (error) {
      console.error('[RestaurantStateService] Unexpected error:', error)
      return false
    }
  }

  /**
   * 提交手动闭店任务
   */
  async submitManualClosing(
    restaurantId: string, 
    userId: string, 
    reason: string = '今日营业结束，手动闭店'
  ): Promise<boolean> {
    try {
      // 先检查是否可以闭店
      const canClose = await this.checkAllTasksCompleted(restaurantId)
      if (!canClose) {
        console.error('[RestaurantStateService] Cannot close - not all tasks completed')
        return false
      }

      // 提交手动闭店任务
      const { error } = await supabase
        .from('roleplay_task_records')
        .insert({
          user_id: userId,
          restaurant_id: restaurantId,
          task_id: 'manual-closing',
          date: (getCurrentTestTime() || new Date()).toISOString().split('T')[0],
          period_id: null,
          status: 'completed',
          is_floating: true,
          submission_type: 'text',
          text_content: reason,
          review_status: 'approved' // 手动闭店自动通过
        })

      if (error) {
        console.error('[RestaurantStateService] Error submitting manual closing:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('[RestaurantStateService] Unexpected error:', error)
      return false
    }
  }
}

// 创建单例
export const restaurantStateService = new RestaurantStateService()