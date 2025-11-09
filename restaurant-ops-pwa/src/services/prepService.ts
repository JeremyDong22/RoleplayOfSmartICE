/**
 * 备餐验收服务
 * Created: 2025-01-11
 * Version: 1.1
 *
 * 更新日志：
 * - v1.1 (2025-11-09): 删除新鲜度检查功能，简化为仅数量检查
 * - v1.0 (2025-01-11): 初始版本
 *
 * 功能：
 * - 加载餐厅的备餐菜品列表
 * - 提供菜品缓存以提升性能
 */

import { supabase } from './supabase'
import { restaurantConfigService } from './restaurantConfigService'

export interface PrepItem {
  id: string
  restaurant_id: string
  item_name: string
  department: '前厅' | '后厨'
  category: string | null
  sort_order: number
}

export interface PrepCheckData {
  item_name: string
  quantity?: number
  notes?: string
}

class PrepService {
  private cache: Map<string, { items: PrepItem[], timestamp: number }> = new Map()
  private CACHE_TTL = 5 * 60 * 1000 // 5分钟缓存

  /**
   * 获取餐厅的备餐菜品列表
   */
  async getPrepItems(restaurantId?: string, department?: '前厅' | '后厨'): Promise<PrepItem[]> {
    try {
      // 使用当前餐厅ID
      const finalRestaurantId = restaurantId || await restaurantConfigService.getRestaurantId()
      if (!finalRestaurantId) {
        throw new Error('Restaurant ID not found')
      }

      // 检查缓存
      const cacheKey = `${finalRestaurantId}-${department || 'all'}`
      const cached = this.cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        console.log('[PrepService] Using cached prep items')
        return cached.items
      }

      // 从数据库加载
      let query = supabase
        .from('roleplay_prep_items')
        .select('*')
        .eq('restaurant_id', finalRestaurantId)
        .eq('is_active', true)

      // 按部门过滤
      if (department) {
        query = query.eq('department', department)
      }

      const { data, error } = await query.order('sort_order', { ascending: true })

      if (error) {
        console.error('[PrepService] Failed to load prep items:', error)
        throw error
      }

      const items = data as PrepItem[]

      // 更新缓存
      this.cache.set(cacheKey, {
        items,
        timestamp: Date.now()
      })

      console.log(`[PrepService] Loaded ${items.length} prep items for ${department || 'all departments'}`)
      return items
    } catch (error) {
      console.error('[PrepService] Error loading prep items:', error)
      throw error
    }
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear()
    console.log('[PrepService] Cache cleared')
  }

  /**
   * 验证备餐检查数据
   */
  validatePrepCheckData(items: PrepCheckData[], prepItems: PrepItem[]): string[] {
    const errors: string[] = []

    items.forEach((item, index) => {
      const prepItem = prepItems.find(p => p.item_name === item.item_name)
      if (!prepItem) {
        errors.push(`第${index + 1}项：菜品"${item.item_name}"不存在`)
        return
      }

      // 检查数量
      if (!item.quantity) {
        errors.push(`第${index + 1}项（${item.item_name}）：数量不能为空`)
      }
    })

    return errors
  }

  /**
   * 格式化备餐数据为存储格式
   */
  formatPrepDataForStorage(items: PrepCheckData[], prepTime: '午市' | '晚市'): any {
    return {
      prep_time: prepTime,
      items: items.map(item => ({
        item_name: item.item_name,
        quantity: item.quantity || null,
        notes: item.notes || null
      })),
      submitted_at: new Date().toISOString()
    }
  }

  /**
   * 生成备餐检查文本摘要（用于显示）
   */
  generateTextSummary(items: PrepCheckData[]): string {
    const lines = items.map(item => {
      const parts = [item.item_name]
      if (item.quantity) {
        parts.push(`数量: ${item.quantity}`)
      }
      if (item.notes) {
        parts.push(`备注: ${item.notes}`)
      }
      return parts.join(' - ')
    })
    return lines.join('\n')
  }
}

export const prepService = new PrepService()
