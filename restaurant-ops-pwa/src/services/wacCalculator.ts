/**
 * WAC (Weighted Average Cost) 价格计算服务
 * Created: 2025-01-22
 * Purpose: 使用加权平均成本法计算损耗盘点的成本
 */

import { supabase } from './supabase'

interface WACResult {
  unitPrice: number
  totalPrice: number
  batches: Array<{
    quantity: number
    unitPrice: number
  }>
}

export class WACCalculator {
  /**
   * 根据加权平均成本法计算物品成本
   * @param itemName 物品名称
   * @param quantity 需要计算的数量
   * @param restaurantId 餐厅ID
   * @returns WAC计算结果
   */
  async calculateWACPrice(
    itemName: string,
    quantity: number,
    restaurantId: string
  ): Promise<WACResult> {
    try {
      // 直接从库存表获取加权平均成本
      const { data: inventory, error: inventoryError } = await supabase
        .from('roleplay_inventory')
        .select('quantity, total_price')
        .eq('item_name', itemName)
        .eq('restaurant_id', restaurantId)
        .single()

      if (inventoryError) {
        console.error('[WACCalculator] Failed to fetch inventory data:', inventoryError)
        return {
          unitPrice: 0,
          totalPrice: 0,
          batches: []
        }
      }

      if (!inventory) {
        console.warn('[WACCalculator] No inventory found for:', itemName)
        return {
          unitPrice: 0,
          totalPrice: 0,
          batches: []
        }
      }

      // 使用加权平均成本计算
      const wacUnitPrice = inventory.quantity > 0 
        ? inventory.total_price / inventory.quantity 
        : 0
      
      const totalCost = quantity * wacUnitPrice
      
      console.log(`[WACCalculator] Using WAC: ${quantity} @ ¥${wacUnitPrice.toFixed(2)} = ¥${totalCost.toFixed(2)}`)
      
      // 如果请求数量超过库存，给出警告
      if (quantity > inventory.quantity) {
        console.warn(`[WACCalculator] Requested quantity (${quantity}) exceeds inventory (${inventory.quantity}) for ${itemName}`)
      }

      const result = {
        unitPrice: Number(wacUnitPrice.toFixed(2)),
        totalPrice: Number(totalCost.toFixed(2)),
        batches: [{ quantity, unitPrice: Number(wacUnitPrice.toFixed(2)) }]
      }

      console.log('[WACCalculator] Calculation result:', result)
      return result

    } catch (error) {
      console.error('[WACCalculator] Error calculating WAC price:', error)
      return {
        unitPrice: 0,
        totalPrice: 0,
        batches: []
      }
    }
  }

  /**
   * 获取物品的加权平均单价
   */
  async getWeightedAveragePrice(
    itemName: string,
    restaurantId: string
  ): Promise<number> {
    try {
      const { data: inventory } = await supabase
        .from('roleplay_inventory')
        .select('quantity, total_price')
        .eq('item_name', itemName)
        .eq('restaurant_id', restaurantId)
        .single()

      if (!inventory || inventory.quantity === 0) return 0
      
      return inventory.total_price / inventory.quantity

    } catch (error) {
      console.error('[WACCalculator] Error getting WAC price:', error)
      return 0
    }
  }

  /**
   * 获取物品的库存信息和价值
   */
  async getInventoryValue(
    itemName: string,
    restaurantId: string
  ): Promise<{
    quantity: number
    totalValue: number
    avgUnitPrice: number
  }> {
    try {
      const { data: inventory } = await supabase
        .from('roleplay_inventory')
        .select('quantity, total_price')
        .eq('item_name', itemName)
        .eq('restaurant_id', restaurantId)
        .single()

      if (!inventory) {
        return { quantity: 0, totalValue: 0, avgUnitPrice: 0 }
      }

      const avgUnitPrice = inventory.quantity > 0 
        ? inventory.total_price / inventory.quantity 
        : 0

      return {
        quantity: inventory.quantity,
        totalValue: inventory.total_price,
        avgUnitPrice: Number(avgUnitPrice.toFixed(2))
      }

    } catch (error) {
      console.error('[WACCalculator] Error getting inventory value:', error)
      return { quantity: 0, totalValue: 0, avgUnitPrice: 0 }
    }
  }
}

// 导出单例
export const wacCalculator = new WACCalculator()