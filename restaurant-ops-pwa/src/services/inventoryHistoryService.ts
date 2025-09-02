/**
 * Inventory History Service
 * Created: 2025-01-24
 * Updated: 2025-08-26 - Connected to roleplay_inventory_records_view with correct column names
 * Purpose: Service for fetching and managing inventory movement history from database
 */

import { supabase } from './supabase'
import { format, parseISO, startOfDay, endOfDay } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { restaurantConfigService } from './restaurantConfigService'

// 库存历史记录类型（对应 roleplay_inventory_records_view 视图的实际列）
export interface InventoryHistoryRecord {
  record_id: string
  task_id: string
  user_id: string
  restaurant_id: string
  record_date: string
  created_at: string  // 操作时间
  task_name: string
  task_role_code: string
  user_name: string  // 操作员名称
  user_role: string
  user_department: string  // 用户部门
  action_type: string  // 操作类型
  item_name: string
  quantity: number | null
  unit: string | null
  unit_price: number | null
  total_price: number | null
  quality_check: string | null  // 质量检查
  loss_reason: string | null  // 损耗原因
  notes: string | null  // 备注
  batch_total_amount: number | null
  submission_status: string
  review_status: string
  movement_type: string  // 移动类型（入库/出库）
  quantity_in: number | null  // 入库数量
  quantity_out: number | null  // 出库数量
  value_in: number | null  // 入库价值
  value_out: number | null  // 出库价值
  restaurant_name: string
  raw_metadata: any
  photo_urls?: string[]  // 图片URLs
}

// 历史记录筛选器类型
export interface InventoryHistoryFilter {
  item_name?: string
  department?: '前厅' | '后厨' | 'all'
  operation_type?: 'in' | 'out' | 'all'  // 入库/出库
  date_from?: string
  date_to?: string
  group_by?: 'item' | 'date' | 'none'
  restaurant_id?: string
}

// 历史记录分组类型
export interface InventoryHistoryGroup {
  key: string // item_name or date
  display_name: string
  records: InventoryHistoryRecord[]
  total_in: number  // 总入库次数
  total_out: number  // 总出库次数
  total_value_in: number  // 总入库价值
  total_value_out: number  // 总出库价值
  latest_operation: string
}

class InventoryHistoryService {
  /**
   * 获取库存历史记录（从数据库视图）
   */
  async getHistoryRecords(filter?: InventoryHistoryFilter): Promise<InventoryHistoryRecord[]> {
    try {
      const restaurantId = filter?.restaurant_id || await restaurantConfigService.getRestaurantId()
      
      let query = supabase
        .from('roleplay_inventory_records_view')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })

      // 应用筛选条件
      if (filter?.item_name) {
        query = query.ilike('item_name', `%${filter.item_name}%`)
      }

      if (filter?.operation_type && filter.operation_type !== 'all') {
        if (filter.operation_type === 'in') {
          query = query.eq('movement_type', '入库')
        } else if (filter.operation_type === 'out') {
          query = query.eq('movement_type', '出库')
        }
      }

      if (filter?.date_from) {
        query = query.gte('created_at', filter.date_from)
      }

      if (filter?.date_to) {
        query = query.lte('created_at', filter.date_to)
      }

      if (filter?.department && filter.department !== 'all') {
        query = query.eq('user_department', filter.department)
      }

      const { data, error } = await query

      if (error) {
        console.error('[InventoryHistoryService] Failed to fetch history records:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('[InventoryHistoryService] Error fetching history records:', error)
      return []
    }
  }

  /**
   * 获取分组后的历史记录
   */
  async getGroupedHistory(filter?: InventoryHistoryFilter): Promise<InventoryHistoryGroup[]> {
    const records = await this.getHistoryRecords(filter)
    
    if (!filter?.group_by || filter.group_by === 'none') {
      // 不分组，返回空数组
      return []
    }

    const groups: Map<string, InventoryHistoryGroup> = new Map()

    records.forEach(record => {
      let groupKey: string
      let displayName: string

      if (filter.group_by === 'item') {
        groupKey = record.item_name
        displayName = record.item_name
      } else if (filter.group_by === 'date') {
        groupKey = record.record_date
        displayName = format(parseISO(record.record_date), 'yyyy年MM月dd日', { locale: zhCN })
      } else {
        return
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          key: groupKey,
          display_name: displayName,
          records: [],
          total_in: 0,
          total_out: 0,
          total_value_in: 0,
          total_value_out: 0,
          latest_operation: record.created_at
        })
      }

      const group = groups.get(groupKey)!
      group.records.push(record)
      
      // 统计入库和出库
      if (record.movement_type === '入库' || record.quantity_in) {
        group.total_in++
        group.total_value_in += record.value_in || record.total_price || 0
      } else if (record.movement_type === '出库' || record.quantity_out) {
        group.total_out++
        group.total_value_out += record.value_out || 0
      }
      
      // 更新最新操作时间
      if (record.created_at > group.latest_operation) {
        group.latest_operation = record.created_at
      }
    })

    return Array.from(groups.values()).sort((a, b) => 
      b.latest_operation.localeCompare(a.latest_operation)
    )
  }

  /**
   * 获取物品列表（用于自动完成）
   */
  async getUniqueItems(restaurantId?: string): Promise<string[]> {
    try {
      const finalRestaurantId = restaurantId || await restaurantConfigService.getRestaurantId()
      
      const { data, error } = await supabase
        .from('roleplay_inventory_items')
        .select('item_name')
        .eq('restaurant_id', finalRestaurantId)
        .order('item_name')

      if (error) {
        console.error('[InventoryHistoryService] Failed to fetch unique items:', error)
        return []
      }

      return (data || []).map(item => item.item_name)
    } catch (error) {
      console.error('[InventoryHistoryService] Error fetching unique items:', error)
      return []
    }
  }

  /**
   * 获取库存历史统计
   */
  async getHistoryStats(filter?: InventoryHistoryFilter): Promise<{
    totalIn: number
    totalOut: number
    totalValueIn: number
    totalValueOut: number
    totalItems: number
  }> {
    const records = await this.getHistoryRecords(filter)
    
    const stats = {
      totalIn: 0,
      totalOut: 0,
      totalValueIn: 0,
      totalValueOut: 0,
      totalItems: new Set<string>()
    }

    records.forEach(record => {
      if (record.movement_type === '入库' || record.quantity_in) {
        stats.totalIn++
        stats.totalValueIn += record.value_in || record.total_price || 0
      } else if (record.movement_type === '出库' || record.quantity_out) {
        stats.totalOut++
        stats.totalValueOut += record.value_out || 0
      }
      if (record.item_name) {
        stats.totalItems.add(record.item_name)
      }
    })

    return {
      ...stats,
      totalItems: stats.totalItems.size
    }
  }
}

// 导出单例
// Export singleton - 使用 Proxy 实现懒加载
let inventoryHistoryServiceInstance: InventoryHistoryService | null = null;

const getInventoryHistoryService = () => {
  if (!inventoryHistoryServiceInstance) {
    inventoryHistoryServiceInstance = new InventoryHistoryService();
  }
  return inventoryHistoryServiceInstance;
};

export const inventoryHistoryService = new Proxy({} as InventoryHistoryService, {
  get(target, prop) {
    const instance = getInventoryHistoryService();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
});