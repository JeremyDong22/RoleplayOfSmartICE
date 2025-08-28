/**
 * 库存管理服务
 * 处理库存物品的CRUD操作和动态结构化字段生成
 * Created: 2025-08-11
 * Updated: 2025-08-26 - 更新为使用 roleplay_inventory_items 表
 * Purpose: 动态管理收货验货的物品列表和单位
 */

import { supabase } from './supabase'
import { restaurantConfigService } from './restaurantConfigService'

export interface InventoryItem {
  id: string
  restaurant_id?: string
  item_name: string
  unit: string
  department: string
  category?: string
  subcategory?: string
  distribution_channel?: string
  warning_quantity?: number
  created_at?: string
  updated_at?: string
  // 以下字段不再存储在 items 表中，而是通过 task_records 计算
  quantity?: number  // 可选，通过计算得出
  total_price?: number  // 可选，通过计算得出
}

interface StructuredField {
  key: string
  type: string
  label: string
  options?: string[]
  mapping?: Record<string, string>
  required?: boolean
  min?: number
  decimal?: boolean
}

class InventoryService {
  private inventoryCache: Map<string, InventoryItem[]> = new Map()
  private lastFetchTime: number = 0
  private CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

  /**
   * 获取指定部门的库存物品列表
   */
  async getInventoryItems(department: '前厅' | '后厨'): Promise<InventoryItem[]> {
    const now = Date.now()
    const cacheKey = department
    
    // 检查缓存
    if (this.inventoryCache.has(cacheKey) && (now - this.lastFetchTime) < this.CACHE_DURATION) {
      return this.inventoryCache.get(cacheKey)!
    }

    try {
      // 获取当前餐厅ID
      const restaurantId = await restaurantConfigService.getRestaurantId()
      console.log(`[InventoryService] Fetching items for restaurant: ${restaurantId}, department: ${department}`)
      
      if (!restaurantId) {
        console.warn('[InventoryService] No restaurant ID found, fetching items without restaurant filter')
        // 如果没有餐厅ID，获取所有该部门的物品
        const { data, error } = await supabase
          .from('roleplay_inventory_items')
          .select('*')
          .eq('department', department)
          .order('item_name')
        
        if (error) {
          console.error('[InventoryService] Failed to fetch inventory:', error)
          return []
        }
        
        console.log(`[InventoryService] Found ${data?.length || 0} items for ${department} (no restaurant filter)`)
        this.inventoryCache.set(cacheKey, data || [])
        this.lastFetchTime = now
        return data || []
      }
      
      const { data, error } = await supabase
        .from('roleplay_inventory_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('department', department)
        .order('item_name')

      if (error) {
        console.error('[InventoryService] Failed to fetch inventory:', error)
        return []
      }

      console.log(`[InventoryService] Found ${data?.length || 0} items for ${department}`)
      
      this.inventoryCache.set(cacheKey, data || [])
      this.lastFetchTime = now
      return data || []
    } catch (error) {
      console.error('[InventoryService] Error fetching inventory:', error)
      return []
    }
  }

  /**
   * 根据部门动态生成结构化字段配置
   */
  async generateStructuredFields(department: '前厅' | '后厨', isLossCount: boolean = false): Promise<{
    enabled: boolean
    fields: StructuredField[]
  }> {
    const items = await this.getInventoryItems(department)
    
    if (items.length === 0) {
      console.warn(`[InventoryService] No inventory items found for department: ${department}`)
      // 仍然返回 enabled: true，但是字段为空选项
      return {
        enabled: true,  // 改为 true，确保显示结构
        fields: []
      }
    }

    // 创建物品名称到单位的映射
    const unitMapping: Record<string, string> = {}
    const itemOptions: string[] = []
    
    items.forEach(item => {
      itemOptions.push(item.item_name)
      unitMapping[item.item_name] = item.unit
    })

    const fields: StructuredField[] = [
      {
        key: 'item_name',
        type: 'select',
        label: '物品名称',
        options: itemOptions,
        required: true
      },
      {
        key: 'quantity',
        type: 'number',
        label: '数量',
        decimal: true,
        min: 0,
        required: true
      },
      {
        key: 'unit',
        type: 'auto',
        label: '单位',
        mapping: unitMapping
      }
    ]

    // 损耗盘点不需要价格和质量检查
    if (!isLossCount) {
      fields.push(
        {
          key: 'unit_price',
          type: 'number',
          label: '单价',
          decimal: true,
          min: 0,
          required: false
        },
        {
          key: 'total_price',
          type: 'number',
          label: '总价',
          decimal: true,
          min: 0,
          required: false
        },
        {
          key: 'quality_check',  // 改为 quality_check 以与 taskSubmissionHelper 保持一致
          type: 'select',
          label: '质量检查',
          options: ['合格', '不合格'],
          required: true
        }
      )
    }

    return {
      enabled: true,
      fields
    }
  }

  /**
   * 获取指定物品的当前库存数量
   * 注意：Phase 2 之后会从 task_records 中计算
   * 目前暂时返回 null，表示不显示库存数量
   */
  async getItemQuantity(itemName: string): Promise<number | null> {
    // Phase 2 之后实现
    return null
  }

  /**
   * 更新库存数量和价格
   * 注意：Phase 1 中，库存变化直接记录在 task_records 中
   * 这个方法保留是为了兼容性，但不再实际更新数据
   */
  async updateInventoryQuantity(
    itemName: string,
    quantity: number,
    operation: 'add' | 'subtract' = 'add',
    unitPrice?: number
  ): Promise<boolean> {
    // 库存变化会通过 task_records 自动记录
    // 这里只返回 true 表示操作成功
    console.log(`[InventoryService] 库存变化将记录在 task_records: ${itemName} ${operation} ${quantity}`)
    return true
  }

  /**
   * 批量更新库存（处理多个物品）
   */
  async batchUpdateInventory(
    items: Array<{ 
      itemName: string; 
      quantity: number; 
      operation?: 'add' | 'subtract';
      unitPrice?: number;  // 新增：支持单价
    }>
  ): Promise<boolean> {
    try {
      const results = await Promise.all(
        items.map(item => 
          this.updateInventoryQuantity(
            item.itemName, 
            item.quantity, 
            item.operation || 'add',
            item.unitPrice  // 传递单价
          )
        )
      )
      
      return results.every(result => result === true)
    } catch (error) {
      console.error('[InventoryService] Error in batch update:', error)
      return false
    }
  }

  /**
   * 添加新的库存物品
   */
  async addInventoryItem(
    itemName: string,
    unit: string,
    department: '前厅' | '后厨',
    restaurantId?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('roleplay_inventory_items')
        .insert({
          item_name: itemName,
          unit,
          department,
          restaurant_id: restaurantId
          // 不再设置 quantity，因为新表没有这个字段
        })

      if (error) {
        console.error('[InventoryService] Failed to add inventory item:', error)
        return false
      }

      // 清除缓存
      this.inventoryCache.clear()
      
      console.log(`[InventoryService] Added new item: ${itemName} (${unit}) to ${department}`)
      return true
    } catch (error) {
      console.error('[InventoryService] Error adding inventory item:', error)
      return false
    }
  }

  /**
   * 获取所有库存物品
   */
  async getAllInventory(): Promise<InventoryItem[]> {
    try {
      const restaurantId = await restaurantConfigService.getRestaurantId()
      
      const { data, error } = await supabase
        .from('roleplay_inventory_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('department')
        .order('item_name')

      if (error) {
        console.error('[InventoryService] Failed to fetch all inventory:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('[InventoryService] Error fetching all inventory:', error)
      return []
    }
  }

  /**
   * 更新库存物品信息
   */
  async updateInventory(itemId: string, updates: Partial<InventoryItem>): Promise<boolean> {
    try {
      // 过滤掉不应该存储在 items 表中的字段
      const { quantity, total_price, ...validUpdates } = updates
      
      const { error } = await supabase
        .from('roleplay_inventory_items')
        .update({
          ...validUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)

      if (error) {
        console.error('[InventoryService] Failed to update inventory item:', error)
        return false
      }

      // 清除缓存
      this.inventoryCache.clear()
      
      return true
    } catch (error) {
      console.error('[InventoryService] Error updating inventory item:', error)
      return false
    }
  }

  /**
   * 清除缓存（在需要强制刷新时调用）
   */
  clearCache(): void {
    this.inventoryCache.clear()
    this.lastFetchTime = 0
  }
}

// 导出单例
export const inventoryService = new InventoryService()