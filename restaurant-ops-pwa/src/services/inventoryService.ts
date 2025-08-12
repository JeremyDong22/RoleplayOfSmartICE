/**
 * 库存管理服务
 * 处理库存物品的CRUD操作和动态结构化字段生成
 * Created: 2025-08-11
 * Purpose: 动态管理收货验货的物品列表和单位
 */

import { supabase } from './supabase'

export interface InventoryItem {
  id: string
  restaurant_id?: string
  item_name: string
  quantity: number
  unit: string
  department: string
  total_price?: number
  last_updated?: string
  created_at?: string
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
      const { data, error } = await supabase
        .from('roleplay_inventory')
        .select('*')
        .eq('department', department)
        .order('item_name')

      if (error) {
        console.error('[InventoryService] Failed to fetch inventory:', error)
        return []
      }

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
   */
  async getItemQuantity(itemName: string): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .from('roleplay_inventory')
        .select('quantity')
        .eq('item_name', itemName)
        .single()

      if (error) {
        console.error('[InventoryService] Failed to fetch item quantity:', error)
        return null
      }

      return data?.quantity || 0
    } catch (error) {
      console.error('[InventoryService] Error fetching item quantity:', error)
      return null
    }
  }

  /**
   * 更新库存数量（收货时调用）
   */
  async updateInventoryQuantity(
    itemName: string,
    quantity: number,
    operation: 'add' | 'subtract' = 'add'
  ): Promise<boolean> {
    try {
      // 先获取当前库存
      const { data: currentItem, error: fetchError } = await supabase
        .from('roleplay_inventory')
        .select('id, quantity')
        .eq('item_name', itemName)
        .single()

      if (fetchError) {
        console.error('[InventoryService] Failed to fetch current inventory:', fetchError)
        return false
      }

      if (!currentItem) {
        console.error('[InventoryService] Item not found:', itemName)
        return false
      }

      // 计算新数量
      const currentQuantity = parseFloat(currentItem.quantity || '0')
      const newQuantity = operation === 'add' 
        ? currentQuantity + quantity 
        : Math.max(0, currentQuantity - quantity)

      // 更新数量
      const { error: updateError } = await supabase
        .from('roleplay_inventory')
        .update({ 
          quantity: newQuantity,
          last_updated: new Date().toISOString()
        })
        .eq('id', currentItem.id)

      if (updateError) {
        console.error('[InventoryService] Failed to update inventory:', updateError)
        return false
      }

      // 清除缓存，下次会重新获取
      this.inventoryCache.clear()
      
      console.log(`[InventoryService] Updated ${itemName}: ${currentQuantity} -> ${newQuantity}`)
      return true
    } catch (error) {
      console.error('[InventoryService] Error updating inventory:', error)
      return false
    }
  }

  /**
   * 批量更新库存（处理多个物品）
   */
  async batchUpdateInventory(
    items: Array<{ itemName: string; quantity: number; operation?: 'add' | 'subtract' }>
  ): Promise<boolean> {
    try {
      const results = await Promise.all(
        items.map(item => 
          this.updateInventoryQuantity(item.itemName, item.quantity, item.operation || 'add')
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
        .from('roleplay_inventory')
        .insert({
          item_name: itemName,
          unit,
          department,
          restaurant_id: restaurantId,
          quantity: 0
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
   * 清除缓存（在需要强制刷新时调用）
   */
  clearCache(): void {
    this.inventoryCache.clear()
    this.lastFetchTime = 0
  }
}

// 导出单例
export const inventoryService = new InventoryService()