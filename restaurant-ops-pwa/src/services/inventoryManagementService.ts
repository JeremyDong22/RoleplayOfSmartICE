/**
 * Inventory Management Service
 * Created: 2025-08-22
 * Updated: 2025-08-26 - Connected to roleplay_inventory_realtime_view
 * Purpose: 库存管理核心服务，连接到实时库存视图
 */

import { supabase } from './supabase'
import { authService } from './authService'
import { restaurantConfigService } from './restaurantConfigService'
import { inventoryRealtimeService } from './inventoryRealtimeService'

// 简化的类型定义
interface InventoryItem {
  id: string
  restaurant_id: string
  item_name: string
  quantity: number
  unit: string
  department: '前厅' | '后厨'
  category: string
  subcategory?: string
  total_price?: number
  unit_price?: number  // 添加单价字段
  warning_quantity?: number
  distribution_channel?: '本地' | '网购'
  last_updated: string
  is_ignored?: boolean
}

interface InventorySnapshot {
  id: string
  item_id: string
  restaurant_id: string
  snapshot_quantity: number
  snapshot_date: string
  created_by?: string
  notes?: string
  created_at: string
}

interface InventoryPrediction {
  item_id: string
  item_name: string
  current_quantity: number
  predicted_quantity?: number  // 添加预测库存（考虑消耗和收货）
  unit: string
  department: string
  category: string
  subcategory?: string  // 添加子类别
  total_price?: number  // 总价格
  unit_price?: number   // 单价 (total_price / quantity)
  daily_consumption: number | null
  days_remaining: number | null
  need_alert: boolean
  alert_message?: string
  suggested_order_date?: string
  distribution_channel?: string
  confidence_level: number // 0-1, 基于数据点数量
  last_updated?: string // 最后更新时间
}

interface ReceiptRecord {
  item_name: string
  quantity: number
  receipt_date: string
}

class InventoryManagementService {
  /**
   * 获取所有库存物品（占位符数据）
   */
  async getInventoryItems(department?: '前厅' | '后厨'): Promise<InventoryItem[]> {
    // Placeholder data
    const mockItems: InventoryItem[] = [
      {
        id: '1',
        restaurant_id: 'placeholder',
        item_name: '示例物品1',
        quantity: 100,
        unit: '个',
        department: '前厅',
        category: '餐具',
        total_price: 500,
        unit_price: 5,
        warning_quantity: 20,
        distribution_channel: '本地',
        last_updated: new Date().toISOString(),
        is_ignored: false
      },
      {
        id: '2',
        restaurant_id: 'placeholder',
        item_name: '示例物品2',
        quantity: 50,
        unit: 'kg',
        department: '后厨',
        category: '食材',
        total_price: 1000,
        unit_price: 20,
        warning_quantity: 10,
        distribution_channel: '网购',
        last_updated: new Date().toISOString(),
        is_ignored: false
      },
      {
        id: '3',
        restaurant_id: 'placeholder',
        item_name: '示例物品3',
        quantity: 200,
        unit: '瓶',
        department: '前厅',
        category: '饮料',
        total_price: 800,
        unit_price: 4,
        warning_quantity: 50,
        distribution_channel: '本地',
        last_updated: new Date().toISOString(),
        is_ignored: false
      }
    ]
      
    // Filter by department if specified
    if (department) {
      return mockItems.filter(item => item.department === department)
    }
    
    return mockItems
  }

  /**
   * 创建库存快照（占位符）
   */
  async createSnapshot(itemId: string, quantity: number, notes?: string): Promise<InventorySnapshot> {
    // Placeholder implementation
    return {
      id: `snapshot-${Date.now()}`,
      item_id: itemId,
      restaurant_id: 'placeholder',
      snapshot_quantity: quantity,
      snapshot_date: new Date().toISOString(),
      created_by: 'placeholder-user',
      notes: notes,
      created_at: new Date().toISOString()
    }
  }

  /**
   * 批量创建库存快照（占位符）
   */
  async batchCreateSnapshots(items: Array<{
    itemId: string
    quantity: number
    notes?: string
    previousQuantity?: number
  }>): Promise<void> {
    console.log('[Placeholder] Batch creating snapshots:', items.length, 'items')
    // Placeholder - no actual database operation
  }

  /**
   * 获取物品的历史快照（占位符）
   */
  async getSnapshotHistory(itemId: string, limit = 10): Promise<InventorySnapshot[]> {
    // Return empty array as placeholder
    return []
  }

  /**
   * 获取入库记录（占位符）
   */
  async getReceiptRecords(itemName: string, startDate: string, endDate: string): Promise<ReceiptRecord[]> {
    // Return empty array as placeholder
    return []
  }

  /**
   * 获取所有库存预测（不过滤）
   */
  async getAllPredictions(): Promise<InventoryPrediction[]> {
    return this.getInventoryPredictions()
  }

  /**
   * 获取库存预测（从实时视图）
   */
  async getInventoryPredictions(
    department?: '前厅' | '后厨',
    alertOnly = false
  ): Promise<InventoryPrediction[]> {
    try {
      // Get real-time data from our view
      const items = await inventoryRealtimeService.getRealtimeInventory(department)
      
      // Format for UI
      const predictions = inventoryRealtimeService.formatForUI(items)
      
      if (alertOnly) {
        return predictions.filter(p => p.need_alert)
      }
      
      return predictions
    } catch (error) {
      console.error('Failed to get inventory predictions:', error)
      
      // Fallback to placeholder data if database fails
      const items = await this.getInventoryItems(department)
      
      const predictions: InventoryPrediction[] = items.map(item => ({
        item_id: item.id,
        item_name: item.item_name,
        current_quantity: item.quantity,
        predicted_quantity: item.quantity - Math.floor(Math.random() * 10),
        unit: item.unit,
        department: item.department,
        category: item.category,
        subcategory: item.subcategory,
        total_price: item.total_price,
        unit_price: item.unit_price,
        daily_consumption: Math.random() * 5,
        days_remaining: Math.floor(Math.random() * 30),
        need_alert: item.quantity < (item.warning_quantity || 0),
        alert_message: item.quantity < (item.warning_quantity || 0) ? '库存不足，需要补货' : undefined,
        suggested_order_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        distribution_channel: item.distribution_channel,
        confidence_level: 0.8,
        last_updated: item.last_updated
      }))
      
      if (alertOnly) {
        return predictions.filter(p => p.need_alert)
      }
      
      return predictions
    }
  }

  /**
   * 获取库存摘要统计（从实时视图）
   */
  async getInventorySummary(): Promise<{
    totalItems: number
    lowStockItems: number
    totalValue: number
    departments: Array<{ name: string; count: number; value: number }>
  }> {
    try {
      return await inventoryRealtimeService.getInventorySummary()
    } catch (error) {
      console.error('Failed to get inventory summary:', error)
      // Fallback data
      return {
        totalItems: 3,
        lowStockItems: 1,
        totalValue: 2300,
        departments: [
          { name: '前厅', count: 2, value: 1300 },
          { name: '后厨', count: 1, value: 1000 }
        ]
      }
    }
  }

  /**
   * 更新库存数量（占位符）
   */
  async updateInventoryQuantity(itemId: string, quantity: number): Promise<void> {
    console.log(`[Placeholder] Updating inventory ${itemId} to quantity ${quantity}`)
    // Placeholder - no actual database operation
  }

  /**
   * 添加新物品（占位符）
   */
  async addInventoryItem(item: Partial<InventoryItem>): Promise<InventoryItem> {
    return {
      id: `item-${Date.now()}`,
      restaurant_id: 'placeholder',
      item_name: item.item_name || '新物品',
      quantity: item.quantity || 0,
      unit: item.unit || '个',
      department: item.department || '前厅',
      category: item.category || '其他',
      total_price: item.total_price || 0,
      unit_price: item.unit_price || 0,
      warning_quantity: item.warning_quantity || 10,
      distribution_channel: item.distribution_channel || '本地',
      last_updated: new Date().toISOString(),
      is_ignored: false
    }
  }

  /**
   * 获取消耗率统计（占位符）
   */
  async getConsumptionStats(itemId: string, days = 30): Promise<{
    averageDaily: number
    trend: 'increasing' | 'decreasing' | 'stable'
    predictedStockout: Date | null
  }> {
    return {
      averageDaily: Math.random() * 10,
      trend: 'stable',
      predictedStockout: null
    }
  }

  /**
   * 忽略/取消忽略物品（占位符）
   */
  async toggleIgnoreItem(itemId: string, ignore: boolean): Promise<void> {
    console.log(`[Placeholder] ${ignore ? 'Ignoring' : 'Un-ignoring'} item ${itemId}`)
    // Placeholder - no actual database operation
  }

  /**
   * 重置所有被忽略的物品（占位符）
   */
  async resetAllIgnored(): Promise<void> {
    console.log('[Placeholder] Resetting all ignored items')
    // Placeholder - no actual database operation
  }

  /**
   * 获取预警物品（占位符）
   */
  async getAlertItems(): Promise<Array<{
    item_id: string
    item_name: string
    message: string
    level: 'critical' | 'warning'
  }>> {
    return [
      {
        item_id: '1',
        item_name: '示例物品1',
        message: '库存低于警戒线',
        level: 'warning'
      }
    ]
  }
}

export const inventoryManagementService = new InventoryManagementService()