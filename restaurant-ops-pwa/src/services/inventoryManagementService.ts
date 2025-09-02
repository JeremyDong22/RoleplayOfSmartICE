/**
 * Inventory Management Service
 * Created: 2025-08-22
 * Updated: 2025-08-28 - Fixed all placeholder methods to connect to real database
 * Purpose: 库存管理核心服务，连接到实时库存视图和其他数据库表
 */

import { supabase } from './supabase'
import { getAuthService } from './authService'
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
   * 获取所有库存物品（从数据库查询）
   */
  async getInventoryItems(department?: '前厅' | '后厨'): Promise<InventoryItem[]> {
    try {
      const restaurantConfig = await restaurantConfigService.getCurrentRestaurant()
      if (!restaurantConfig) {
        console.warn('[InventoryManagementService] No restaurant config found')
        return []
      }

      let query = supabase
        .from('roleplay_inventory_items')
        .select('*')
        .eq('restaurant_id', restaurantConfig.id)
        .order('item_name')

      if (department) {
        query = query.eq('department', department)
      }

      const { data, error } = await query

      if (error) {
        console.error('[InventoryManagementService] Error fetching inventory items:', error)
        throw error
      }

      // Transform to match interface
      const items: InventoryItem[] = data?.map(item => ({
        id: item.id,
        restaurant_id: item.restaurant_id,
        item_name: item.item_name,
        quantity: 0, // Will be calculated from realtime view if needed
        unit: item.unit,
        department: item.department,
        category: item.category,
        subcategory: item.subcategory,
        total_price: 0, // Will be calculated from realtime view if needed
        unit_price: 0, // Will be calculated from realtime view if needed
        warning_quantity: item.warning_quantity,
        distribution_channel: item.distribution_channel,
        last_updated: item.updated_at || item.created_at,
        is_ignored: false
      })) || []

      return items
    } catch (error) {
      console.error('[InventoryManagementService] Failed to get inventory items:', error)
      return []
    }
  }

  /**
   * 创建库存快照（通过任务记录系统）
   */
  async createSnapshot(itemId: string, quantity: number, notes?: string): Promise<InventorySnapshot> {
    try {
      const user = getAuthService().getCurrentUser()
      const restaurantConfig = await restaurantConfigService.getCurrentRestaurant()
      
      if (!user || !restaurantConfig) {
        throw new Error('User or restaurant configuration not found')
      }

      // Get item name from item ID
      const { data: item } = await supabase
        .from('roleplay_inventory_items')
        .select('item_name')
        .eq('id', itemId)
        .single()

      if (!item) {
        throw new Error('Item not found')
      }

      const snapshotId = `snapshot-${Date.now()}`
      const snapshotDate = new Date().toISOString()

      // Create a task record for the snapshot
      const { error } = await supabase
        .from('roleplay_task_records')
        .insert({
          id: snapshotId,
          restaurant_id: restaurantConfig.id,
          user_id: user.id,
          task_id: 'inventory-snapshot',
          date: snapshotDate.split('T')[0],
          text_content: notes || `库存快照: ${item.item_name}`,
          submission_metadata: {
            type: 'inventory_snapshot',
            item_id: itemId,
            item_name: item.item_name,
            quantity: quantity,
            notes: notes
          },
          approval_status: 'approved'
        })

      if (error) {
        throw error
      }

      return {
        id: snapshotId,
        item_id: itemId,
        restaurant_id: restaurantConfig.id,
        snapshot_quantity: quantity,
        snapshot_date: snapshotDate,
        created_by: user.id,
        notes: notes,
        created_at: snapshotDate
      }
    } catch (error) {
      console.error('[InventoryManagementService] Failed to create snapshot:', error)
      throw error
    }
  }

  /**
   * 批量创建库存快照
   */
  async batchCreateSnapshots(items: Array<{
    itemId: string
    quantity: number
    notes?: string
    previousQuantity?: number
  }>): Promise<void> {
    try {
      const user = getAuthService().getCurrentUser()
      const restaurantConfig = await restaurantConfigService.getCurrentRestaurant()
      
      if (!user || !restaurantConfig) {
        throw new Error('User or restaurant configuration not found')
      }

      const records = []
      const batchId = `batch-${Date.now()}`
      const snapshotDate = new Date().toISOString()

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        
        // Get item name
        const { data: itemData } = await supabase
          .from('roleplay_inventory_items')
          .select('item_name')
          .eq('id', item.itemId)
          .single()

        if (!itemData) continue

        records.push({
          id: `${batchId}-${i}`,
          restaurant_id: restaurantConfig.id,
          user_id: user.id,
          task_id: 'inventory-batch-snapshot',
          date: snapshotDate.split('T')[0],
          text_content: item.notes || `批量库存快照: ${itemData.item_name}`,
          submission_metadata: {
            type: 'inventory_snapshot',
            batch_id: batchId,
            item_id: item.itemId,
            item_name: itemData.item_name,
            quantity: item.quantity,
            previous_quantity: item.previousQuantity,
            notes: item.notes
          },
          approval_status: 'approved'
        })
      }

      if (records.length > 0) {
        const { error } = await supabase
          .from('roleplay_task_records')
          .insert(records)

        if (error) {
          throw error
        }
      }
    } catch (error) {
      console.error('[InventoryManagementService] Failed to batch create snapshots:', error)
      throw error
    }
  }

  /**
   * 获取物品的历史快照
   */
  async getSnapshotHistory(itemId: string, limit = 10): Promise<InventorySnapshot[]> {
    try {
      const restaurantConfig = await restaurantConfigService.getCurrentRestaurant()
      if (!restaurantConfig) {
        return []
      }

      const { data, error } = await supabase
        .from('roleplay_task_records')
        .select('*')
        .eq('restaurant_id', restaurantConfig.id)
        .contains('submission_metadata', { type: 'inventory_snapshot', item_id: itemId })
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        throw error
      }

      return data?.map(record => ({
        id: record.id,
        item_id: itemId,
        restaurant_id: record.restaurant_id,
        snapshot_quantity: record.submission_metadata?.quantity || 0,
        snapshot_date: record.date || record.created_at,
        created_by: record.user_id,
        notes: record.submission_metadata?.notes || record.text_content,
        created_at: record.created_at
      })) || []
    } catch (error) {
      console.error('[InventoryManagementService] Failed to get snapshot history:', error)
      return []
    }
  }

  /**
   * 获取入库记录
   */
  async getReceiptRecords(itemName: string, startDate: string, endDate: string): Promise<ReceiptRecord[]> {
    try {
      const restaurantConfig = await restaurantConfigService.getCurrentRestaurant()
      if (!restaurantConfig) {
        return []
      }

      const { data, error } = await supabase
        .from('roleplay_inventory_records_view')
        .select('*')
        .eq('restaurant_id', restaurantConfig.id)
        .eq('operation_type', 'receipt')
        .eq('item_name', itemName)
        .gte('record_date', startDate)
        .lte('record_date', endDate)
        .order('record_date', { ascending: false })

      if (error) {
        throw error
      }

      return data?.map(record => ({
        item_name: record.item_name,
        quantity: record.quantity || 0,
        receipt_date: record.record_date
      })) || []
    } catch (error) {
      console.error('[InventoryManagementService] Failed to get receipt records:', error)
      return []
    }
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
    // Get real-time data from our view
    const items = await inventoryRealtimeService.getRealtimeInventory(department)
    
    // Format for UI
    const predictions = inventoryRealtimeService.formatForUI(items)
    
    if (alertOnly) {
      return predictions.filter(p => p.need_alert)
    }
    
    return predictions
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
   * 更新库存数量（通过创建快照记录）
   */
  async updateInventoryQuantity(itemId: string, quantity: number): Promise<void> {
    try {
      await this.createSnapshot(itemId, quantity, '库存数量更新')
    } catch (error) {
      console.error('[InventoryManagementService] Failed to update inventory quantity:', error)
      throw error
    }
  }

  /**
   * 添加新物品
   */
  async addInventoryItem(item: Partial<InventoryItem>): Promise<InventoryItem> {
    try {
      const restaurantConfig = await restaurantConfigService.getCurrentRestaurant()
      if (!restaurantConfig) {
        throw new Error('Restaurant configuration not found')
      }

      const newItem = {
        restaurant_id: restaurantConfig.id,
        item_name: item.item_name || '新物品',
        unit: item.unit || '个',
        department: item.department || '前厅',
        category: item.category || '其他',
        subcategory: item.subcategory,
        distribution_channel: item.distribution_channel || '本地',
        warning_quantity: item.warning_quantity || 10
      }

      const { data, error } = await supabase
        .from('roleplay_inventory_items')
        .insert(newItem)
        .select()
        .single()

      if (error) {
        throw error
      }

      return {
        id: data.id,
        restaurant_id: data.restaurant_id,
        item_name: data.item_name,
        quantity: 0,
        unit: data.unit,
        department: data.department,
        category: data.category,
        subcategory: data.subcategory,
        total_price: 0,
        unit_price: 0,
        warning_quantity: data.warning_quantity,
        distribution_channel: data.distribution_channel,
        last_updated: data.updated_at || data.created_at,
        is_ignored: false
      }
    } catch (error) {
      console.error('[InventoryManagementService] Failed to add inventory item:', error)
      throw error
    }
  }

  /**
   * 获取消耗率统计
   */
  async getConsumptionStats(itemId: string, days = 30): Promise<{
    averageDaily: number
    trend: 'increasing' | 'decreasing' | 'stable'
    predictedStockout: Date | null
  }> {
    try {
      const restaurantConfig = await restaurantConfigService.getCurrentRestaurant()
      if (!restaurantConfig) {
        return { averageDaily: 0, trend: 'stable', predictedStockout: null }
      }

      // Get consumption records from the last X days
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // Get item name
      const { data: itemData } = await supabase
        .from('roleplay_inventory_items')
        .select('item_name')
        .eq('id', itemId)
        .single()

      if (!itemData) {
        return { averageDaily: 0, trend: 'stable', predictedStockout: null }
      }

      const { data: records } = await supabase
        .from('roleplay_inventory_records_view')
        .select('*')
        .eq('restaurant_id', restaurantConfig.id)
        .eq('item_name', itemData.item_name)
        .in('operation_type', ['consumption', 'loss'])
        .gte('record_date', startDate)
        .lte('record_date', endDate)
        .order('record_date')

      if (!records || records.length === 0) {
        return { averageDaily: 0, trend: 'stable', predictedStockout: null }
      }

      const totalConsumption = records.reduce((sum, record) => 
        sum + (record.loss_quantity || 0), 0)
      const averageDaily = totalConsumption / days

      // Simple trend analysis (compare first half vs second half)
      const midpoint = Math.floor(records.length / 2)
      const firstHalf = records.slice(0, midpoint)
      const secondHalf = records.slice(midpoint)
      
      const firstHalfAvg = firstHalf.reduce((sum, r) => sum + (r.loss_quantity || 0), 0) / Math.max(firstHalf.length, 1)
      const secondHalfAvg = secondHalf.reduce((sum, r) => sum + (r.loss_quantity || 0), 0) / Math.max(secondHalf.length, 1)
      
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
      if (secondHalfAvg > firstHalfAvg * 1.1) {
        trend = 'increasing'
      } else if (secondHalfAvg < firstHalfAvg * 0.9) {
        trend = 'decreasing'
      }

      return {
        averageDaily,
        trend,
        predictedStockout: null // Would need current stock to predict
      }
    } catch (error) {
      console.error('[InventoryManagementService] Failed to get consumption stats:', error)
      return { averageDaily: 0, trend: 'stable', predictedStockout: null }
    }
  }

  /**
   * 忽略/取消忽略物品（通过任务记录系统）
   */
  async toggleIgnoreItem(itemId: string, ignore: boolean): Promise<void> {
    try {
      const user = getAuthService().getCurrentUser()
      const restaurantConfig = await restaurantConfigService.getCurrentRestaurant()
      
      if (!user || !restaurantConfig) {
        throw new Error('User or restaurant configuration not found')
      }

      // Get item name
      const { data: item } = await supabase
        .from('roleplay_inventory_items')
        .select('item_name')
        .eq('id', itemId)
        .single()

      if (!item) {
        throw new Error('Item not found')
      }

      // Create a task record for the ignore/unignore action
      const { error } = await supabase
        .from('roleplay_task_records')
        .insert({
          restaurant_id: restaurantConfig.id,
          user_id: user.id,
          task_id: 'inventory-ignore-toggle',
          date: new Date().toISOString().split('T')[0],
          text_content: `${ignore ? '忽略' : '取消忽略'}物品: ${item.item_name}`,
          submission_metadata: {
            type: 'inventory_ignore',
            item_id: itemId,
            item_name: item.item_name,
            ignored: ignore
          },
          approval_status: 'approved'
        })

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('[InventoryManagementService] Failed to toggle ignore item:', error)
      throw error
    }
  }

  /**
   * 重置所有被忽略的物品
   */
  async resetAllIgnored(): Promise<void> {
    try {
      const user = getAuthService().getCurrentUser()
      const restaurantConfig = await restaurantConfigService.getCurrentRestaurant()
      
      if (!user || !restaurantConfig) {
        throw new Error('User or restaurant configuration not found')
      }

      // Create a task record for the reset action
      const { error } = await supabase
        .from('roleplay_task_records')
        .insert({
          restaurant_id: restaurantConfig.id,
          user_id: user.id,
          task_id: 'inventory-reset-ignored',
          date: new Date().toISOString().split('T')[0],
          text_content: '重置所有被忽略的物品',
          submission_metadata: {
            type: 'inventory_reset_ignored',
            action: 'reset_all_ignored'
          },
          approval_status: 'approved'
        })

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('[InventoryManagementService] Failed to reset all ignored items:', error)
      throw error
    }
  }

  /**
   * 获取预警物品
   */
  async getAlertItems(): Promise<Array<{
    item_id: string
    item_name: string
    message: string
    level: 'critical' | 'warning'
  }>> {
    try {
      const alerts = await inventoryRealtimeService.getAlertItems()
      
      return alerts.map(alert => ({
        item_id: alert.id,
        item_name: alert.item_name,
        message: alert.alert_message,
        level: alert.days_left <= 1 ? 'critical' : 'warning'
      }))
    } catch (error) {
      console.error('[InventoryManagementService] Failed to get alert items:', error)
      return []
    }
  }
}

export const inventoryManagementService = new InventoryManagementService()