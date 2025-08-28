/**
 * Inventory Realtime Service
 * Created: 2025-08-26
 * Updated: 2025-08-26 - Connect to roleplay_inventory_realtime_view
 * Purpose: Fetch real-time inventory data from our optimized database view
 */

import { supabase } from './supabase'
import { authService } from './authService'
import { restaurantConfigService } from './restaurantConfigService'

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
  
  // Calculated metrics from view
  current_stock: number | null
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
  /**
   * Fetch inventory items from the realtime view
   */
  async getRealtimeInventory(
    department?: '前厅' | '后厨'
  ): Promise<InventoryRealtimeItem[]> {
    try {
      const restaurantConfig = await restaurantConfigService.getCurrentRestaurant()
      if (!restaurantConfig) {
        throw new Error('No restaurant configuration found')
      }
      
      console.log('[InventoryRealtimeService] Fetching for restaurant:', restaurantConfig.id, restaurantConfig.name)

      let query = supabase
        .from('roleplay_inventory_realtime_view')
        .select('*')
        .eq('restaurant_id', restaurantConfig.id)
        .order('item_name')

      if (department) {
        query = query.eq('department', department)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching realtime inventory:', error)
        throw error
      }
      
      console.log('[InventoryRealtimeService] Fetched items:', data?.length || 0)

      return data || []
    } catch (error) {
      console.error('Failed to fetch realtime inventory:', error)
      throw error
    }
  }

  /**
   * Get items that need alerts
   */
  async getAlertItems(): Promise<InventoryAlert[]> {
    try {
      const items = await this.getRealtimeInventory()
      
      return items
        .filter(item => item.is_warning && item.current_stock !== null)
        .map(item => {
          const daysThreshold = item.distribution_channel === '网购' ? 3 : 1
          const orderDate = new Date()
          orderDate.setDate(orderDate.getDate() + Math.max(0, Math.floor((item.days_left || 0) - daysThreshold)))
          
          return {
            id: item.id,
            item_name: item.item_name,
            current_stock: item.current_stock || 0,
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
      current_quantity: item.current_stock || 0,
      predicted_quantity: item.current_stock, // Same as current for now
      
      // Pricing
      unit_price: item.unit_price,
      total_price: item.total_price || ((item.current_stock || 0) * (item.unit_price || 0)),
      
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
}

export const inventoryRealtimeService = new InventoryRealtimeService()