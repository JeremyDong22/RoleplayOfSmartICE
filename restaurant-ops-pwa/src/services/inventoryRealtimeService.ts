/**
 * Inventory Realtime Service
 * Created: 2025-08-26
 * Updated: 2025-09-04 - Use materialized view with background refresh
 * Purpose: Fetch real-time inventory data from materialized view for better performance
 * Changes: 
 *   - Switched to materialized view (roleplay_inventory_realtime_mv)
 *   - Added background refresh mechanism
 *   - Implemented smart caching strategy
 */

import { supabase } from './supabase'
import { getAuthService } from './authService'
import { restaurantConfigService } from './restaurantConfigService'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Types matching our view structure
export interface InventoryRealtimeItem {
  // From roleplay_inventory_items 
  id: string  // The view uses 'id' not 'item_id'
  item_name: string
  unit: string
  category: string
  subcategory: string | null
  department: '前厅' | '后厨'
  warning_quantity: number
  distribution_channel: '本地' | '网购' | null
  specifications?: string | null  // 规格 (e.g., "500ml", "1kg")
  shelf_life?: number | null  // 保质期（天数）
  
  // Calculated metrics from view
  last_count_quantity: number | null  // Actual physical count from last inventory
  predicted_current_stock: number | null  // Predicted stock (last count + receipts - losses)
  daily_consumption: number | null
  days_left: number | null
  is_warning: boolean
  last_count_date: string | null  // Column is last_count_date
  consumption_periods_used: number | null  // Column is consumption_periods_used
  
  // Additional fields for UI
  unit_price?: number | null
  total_price?: number | null
}

export interface InventoryAlert {
  id: string
  item_name: string
  current_stock: number
  daily_consumption: number
  days_left: number
  distribution_channel: string
  alert_message: string
  suggested_order_date?: string
}

class InventoryRealtimeService {
  private lastRefreshTime: Date | null = null
  private isRefreshing = false
  private refreshPromise: Promise<void> | null = null
  private USE_MATERIALIZED_VIEW = true // Feature flag to easily switch between views
  private realtimeChannel: RealtimeChannel | null = null
  private onDataUpdateCallbacks: Set<() => void> = new Set()

  /**
   * Fetch inventory items from the materialized view with background refresh
   */
  async getRealtimeInventory(
    department?: '前厅' | '后厨'
  ): Promise<InventoryRealtimeItem[]> {
    const startTime = performance.now()
    const timings: Record<string, number> = {}
    
    try {
      // Step 1: Get restaurant config
      const configStart = performance.now()
      const restaurantConfig = await restaurantConfigService.getCurrentRestaurant()
      timings['1_getRestaurantConfig'] = performance.now() - configStart
      
      if (!restaurantConfig) {
        throw new Error('No restaurant configuration found')
      }
      
      // Use materialized view for better performance
      const viewName = this.USE_MATERIALIZED_VIEW 
        ? 'roleplay_inventory_realtime_mv' 
        : 'roleplay_inventory_realtime_view'

      // Step 2: Build query
      const queryBuildStart = performance.now()
      let query = supabase
        .from(viewName)
        .select('*')
        .eq('restaurant_id', restaurantConfig.id)
        .order('item_name')

      if (department) {
        query = query.eq('department', department)
      }
      timings['2_buildQuery'] = performance.now() - queryBuildStart

      // Step 3: Execute query
      const queryStart = performance.now()
      const { data, error } = await query
      timings['3_executeQuery'] = performance.now() - queryStart

      if (error) {
        console.error(`Error fetching from ${viewName}:`, error)
        // Fallback to regular view if materialized view fails
        if (this.USE_MATERIALIZED_VIEW) {
          console.log('Falling back to regular view...')
          const fallbackQuery = supabase
            .from('roleplay_inventory_realtime_view')
            .select('*')
            .eq('restaurant_id', restaurantConfig.id)
            .order('item_name')
          
          if (department) {
            fallbackQuery.eq('department', department)
          }
          
          const fallbackResult = await fallbackQuery
          if (fallbackResult.data) {
            return fallbackResult.data
          }
        }
        throw error
      }

      // Step 4: Schedule background refresh (non-blocking)
      const refreshStart = performance.now()
      this.scheduleBackgroundRefresh()
      timings['4_scheduleRefresh'] = performance.now() - refreshStart

      // Step 5: Process data
      const processStart = performance.now()
      const result = data || []
      timings['5_processData'] = performance.now() - processStart
      
      // Log total time and breakdown
      const totalTime = performance.now() - startTime
      console.log(`[InventoryRealtime] Total time: ${totalTime.toFixed(2)}ms`)
      console.log('[InventoryRealtime] Timing breakdown:', {
        ...timings,
        'TOTAL': totalTime.toFixed(2) + 'ms',
        'View': viewName,
        'Items': result.length
      })

      return result
    } catch (error) {
      const totalTime = performance.now() - startTime
      console.error('Failed to fetch realtime inventory:', error)
      console.error(`[InventoryRealtime] Failed after ${totalTime.toFixed(2)}ms`)
      throw error
    }
  }

  /**
   * Schedule a background refresh of the materialized view
   * This runs asynchronously and doesn't block the UI
   */
  private scheduleBackgroundRefresh(): void {
    const now = new Date()
    const ONE_MINUTE = 60 * 1000

    // Skip if already refreshing or recently refreshed
    if (this.isRefreshing || 
        (this.lastRefreshTime && 
         now.getTime() - this.lastRefreshTime.getTime() < ONE_MINUTE)) {
      return
    }

    // Start background refresh
    this.isRefreshing = true
    this.refreshPromise = this.performBackgroundRefresh()
  }

  /**
   * Perform the actual background refresh
   */
  private async performBackgroundRefresh(): Promise<void> {
    try {
      // Call the database function to refresh materialized view
      const { error } = await supabase.rpc('refresh_inventory_realtime_mv')
      
      if (error) {
        console.error('Background refresh failed:', error)
      } else {
        this.lastRefreshTime = new Date()
        console.log('Background refresh completed successfully')
      }
    } catch (error) {
      console.error('Background refresh error:', error)
    } finally {
      this.isRefreshing = false
      this.refreshPromise = null
    }
  }

  /**
   * Force refresh the materialized view (for manual refresh button)
   */
  async forceRefresh(): Promise<void> {
    if (this.refreshPromise) {
      // If already refreshing, wait for it to complete
      return this.refreshPromise
    }

    this.isRefreshing = true
    this.refreshPromise = this.performBackgroundRefresh()
    return this.refreshPromise
  }

  /**
   * Get items that need alerts
   */
  async getAlertItems(): Promise<InventoryAlert[]> {
    try {
      const items = await this.getRealtimeInventory()
      
      return items
        .filter(item => item.is_warning && item.predicted_current_stock !== null)
        .map(item => {
          const daysThreshold = item.distribution_channel === '网购' ? 3 : 1
          const orderDate = new Date()
          orderDate.setDate(orderDate.getDate() + Math.max(0, Math.floor((item.days_left || 0) - daysThreshold)))
          
          return {
            id: item.id,
            item_name: item.item_name,
            current_stock: item.predicted_current_stock || 0,
            daily_consumption: item.daily_consumption || 0,
            days_left: item.days_left || 0,
            distribution_channel: item.distribution_channel || '本地',
            alert_message: `${item.item_name} 预计在 ${Math.floor(item.days_left || 0)} 天内用完，需要补货`,
            suggested_order_date: orderDate.toISOString().split('T')[0]
          }
        })
    } catch (error) {
      console.error('Failed to get alert items:', error)
      return []
    }
  }

  /**
   * Get inventory summary statistics
   */
  async getInventorySummary(): Promise<{
    totalItems: number
    lowStockItems: number
    totalValue: number
    departments: Array<{ name: string; count: number; value: number }>
  }> {
    try {
      const items = await this.getRealtimeInventory()
      
      const lowStockItems = items.filter(item => item.is_warning).length
      
      const departmentStats = ['前厅', '后厨'].map(dept => {
        const deptItems = items.filter(item => item.department === dept)
        return {
          name: dept,
          count: deptItems.length,
          value: deptItems.reduce((sum, item) => sum + (item.total_price || 0), 0)
        }
      })
      
      return {
        totalItems: items.length,
        lowStockItems,
        totalValue: items.reduce((sum, item) => sum + (item.total_price || 0), 0),
        departments: departmentStats
      }
    } catch (error) {
      console.error('Failed to get inventory summary:', error)
      return {
        totalItems: 0,
        lowStockItems: 0,
        totalValue: 0,
        departments: []
      }
    }
  }

  /**
   * Convert realtime items to the format expected by InventoryOverview component
   */
  formatForUI(items: InventoryRealtimeItem[]): any[] {
    return items.map(item => ({
      // Basic item info
      item_id: item.id,  // Map id to item_id for UI compatibility
      item_name: item.item_name,
      unit: item.unit,
      department: item.department,
      category: item.category,
      subcategory: item.subcategory,
      
      // Stock info
      current_quantity: item.predicted_current_stock || 0,  // For compatibility with existing UI
      predicted_quantity: item.predicted_current_stock || 0,
      last_count_quantity: item.last_count_quantity,  // Actual physical count
      
      // Pricing
      unit_price: item.unit_price,
      total_price: item.total_price || ((item.predicted_current_stock || 0) * (item.unit_price || 0)),
      
      // Consumption and alerts
      daily_consumption: item.daily_consumption,
      days_remaining: item.days_left,
      need_alert: item.is_warning,
      alert_message: item.is_warning ? 
        `${item.item_name} 预计在 ${Math.floor(item.days_left || 0)} 天内用完` : 
        undefined,
      
      // Additional info
      distribution_channel: item.distribution_channel || '本地',
      warning_quantity: item.warning_quantity,
      confidence_level: item.consumption_periods_used ? 
        Math.min(item.consumption_periods_used / 3, 1) : 0,
      last_updated: item.last_count_date || new Date().toISOString()
    }))
  }

  /**
   * Subscribe to real-time updates for inventory data changes
   */
  subscribeToUpdates(callback: () => void): () => void {
    // Add callback to the set
    this.onDataUpdateCallbacks.add(callback)
    
    // Initialize real-time subscription if not already done
    if (!this.realtimeChannel) {
      this.initializeRealtimeSubscription()
    }
    
    // Return unsubscribe function
    return () => {
      this.onDataUpdateCallbacks.delete(callback)
      
      // Clean up channel if no more callbacks
      if (this.onDataUpdateCallbacks.size === 0 && this.realtimeChannel) {
        this.realtimeChannel.unsubscribe()
        this.realtimeChannel = null
      }
    }
  }

  /**
   * Initialize real-time subscription to task_records changes
   */
  private initializeRealtimeSubscription(): void {
    this.realtimeChannel = supabase
      .channel('inventory-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'roleplay_task_records',
          filter: 'submission_metadata->structured_data->items'
        },
        (payload) => {
          console.log('Inventory data changed, scheduling refresh...')
          // Schedule background refresh when data changes
          this.scheduleBackgroundRefresh()
          
          // Notify all callbacks after a short delay to allow refresh to complete
          setTimeout(() => {
            this.onDataUpdateCallbacks.forEach(callback => callback())
          }, 2000)
        }
      )
      .subscribe()
  }

  /**
   * Get the status of the service
   */
  getStatus(): {
    usingMaterializedView: boolean
    lastRefreshTime: Date | null
    isRefreshing: boolean
  } {
    return {
      usingMaterializedView: this.USE_MATERIALIZED_VIEW,
      lastRefreshTime: this.lastRefreshTime,
      isRefreshing: this.isRefreshing
    }
  }
}

// Export singleton - 使用 Proxy 实现懒加载
let inventoryRealtimeServiceInstance: InventoryRealtimeService | null = null;

const getInventoryRealtimeService = () => {
  if (!inventoryRealtimeServiceInstance) {
    inventoryRealtimeServiceInstance = new InventoryRealtimeService();
  }
  return inventoryRealtimeServiceInstance;
};

export const inventoryRealtimeService = new Proxy({} as InventoryRealtimeService, {
  get(target, prop) {
    const instance = getInventoryRealtimeService();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
});