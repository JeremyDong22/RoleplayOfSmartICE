/**
 * Optimized Inventory Service
 * Created: 2025-09-04
 * Purpose: 优化的库存服务，单次查询获取所有数据
 * Changes: 
 *   - 使用单个 RPC 调用获取所有库存数据
 *   - 减少网络往返次数
 *   - 客户端缓存
 */

import { supabase } from './supabase'
import { restaurantConfigService } from './restaurantConfigService'
import type { InventoryRealtimeItem } from './inventoryRealtimeService'

interface BatchInventoryData {
  realtimeItems: InventoryRealtimeItem[]
  historyRecords: any[]
  inventoryItems: any[]
}

class InventoryOptimizedService {
  private cache: Map<string, { data: BatchInventoryData; timestamp: number }> = new Map()
  private CACHE_DURATION = 30 * 1000 // 30秒缓存

  /**
   * 批量获取所有库存数据（单次请求）
   */
  async getBatchInventoryData(forceRefresh = false): Promise<BatchInventoryData> {
    const startTime = performance.now()
    
    try {
      const restaurantConfig = await restaurantConfigService.getCurrentRestaurant()
      if (!restaurantConfig) {
        throw new Error('No restaurant configuration found')
      }

      const cacheKey = `batch_${restaurantConfig.id}`
      const now = Date.now()
      
      // 检查缓存
      if (!forceRefresh) {
        const cached = this.cache.get(cacheKey)
        if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
          console.log(`[InventoryOptimized] Using cache (age: ${now - cached.timestamp}ms)`)
          return cached.data
        }
      }

      // 单次批量查询所有数据
      const { data, error } = await supabase.rpc('get_inventory_batch_data', {
        p_restaurant_id: restaurantConfig.id
      })

      if (error) {
        console.error('Batch query failed, falling back to parallel queries', error)
        // 降级到并行查询
        return this.fallbackParallelQueries(restaurantConfig.id)
      }

      const result: BatchInventoryData = {
        realtimeItems: data?.realtime_items || [],
        historyRecords: data?.history_records || [],
        inventoryItems: data?.inventory_items || []
      }

      // 更新缓存
      this.cache.set(cacheKey, { data: result, timestamp: now })

      const totalTime = performance.now() - startTime
      console.log(`[InventoryOptimized] Batch load completed in ${totalTime.toFixed(2)}ms`)
      console.log('[InventoryOptimized] Data sizes:', {
        realtimeItems: result.realtimeItems.length,
        historyRecords: result.historyRecords.length,
        inventoryItems: result.inventoryItems.length
      })

      return result
    } catch (error) {
      console.error('[InventoryOptimized] Batch query error:', error)
      throw error
    }
  }

  /**
   * 降级方案：并行查询
   */
  private async fallbackParallelQueries(restaurantId: string): Promise<BatchInventoryData> {
    console.log('[InventoryOptimized] Using fallback parallel queries')
    
    const [realtime, items, history] = await Promise.all([
      supabase
        .from('roleplay_inventory_realtime_mv')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('item_name'),
      
      supabase
        .from('roleplay_inventory_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('item_name'),
      
      supabase
        .from('roleplay_inventory_records_view')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('record_date', { ascending: false })
        .limit(100)
    ])

    return {
      realtimeItems: realtime.data || [],
      historyRecords: history.data || [],
      inventoryItems: items.data || []
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear()
    console.log('[InventoryOptimized] Cache cleared')
  }

  /**
   * 获取缓存状态
   */
  getCacheStatus(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

export const inventoryOptimizedService = new InventoryOptimizedService()