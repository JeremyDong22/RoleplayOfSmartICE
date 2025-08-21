/**
 * FIFO价格计算服务
 * Created: 2025-01-12
 * Updated: 2025-01-21 - Use view-based approach instead of price_history table
 * Purpose: 实现先进先出的价格计算逻辑，用于损耗盘点时自动计算成本
 */

import { supabase } from './supabase'

interface PriceBatch {
  id: string
  unit_price: number | null
  total_price: number | null
  quantity: number
  remaining_quantity: number
  created_at: string
}

interface FIFOResult {
  unitPrice: number
  totalPrice: number
  batches: Array<{
    quantity: number
    unitPrice: number
  }>
}

export class FIFOCalculator {
  /**
   * 根据FIFO原则计算物品的平均成本
   * @param itemName 物品名称
   * @param quantity 需要计算的数量
   * @param restaurantId 餐厅ID
   * @returns FIFO计算结果
   */
  async calculateFIFOPrice(
    itemName: string,
    quantity: number,
    restaurantId: string
  ): Promise<FIFOResult> {
    try {
      // 使用新的FIFO视图获取库存批次信息
      const { data: fifoBatches, error: fifoError } = await supabase
        .from('roleplay_inventory_fifo_view')
        .select('*')
        .eq('item_name', itemName)
        .eq('restaurant_id', restaurantId)
        .gt('remaining_quantity', 0)
        .order('created_at', { ascending: true }) // FIFO: 最早的先出

      if (fifoError) {
        return {
          unitPrice: 0,
          totalPrice: 0,
          batches: []
        }
      }

      if (!fifoBatches || fifoBatches.length === 0) {
        // 如果没有历史记录，尝试从库存表获取平均价格
        const { data: inventory } = await supabase
          .from('roleplay_inventory')
          .select('quantity, total_price')
          .eq('item_name', itemName)
          .eq('restaurant_id', restaurantId)
          .single()
        
        if (inventory && inventory.quantity > 0) {
          const avgPrice = inventory.total_price / inventory.quantity
          return {
            unitPrice: Number(avgPrice.toFixed(2)),
            totalPrice: Number((avgPrice * quantity).toFixed(2)),
            batches: [{ quantity, unitPrice: Number(avgPrice.toFixed(2)) }]
          }
        }
        
        return {
          unitPrice: 0,
          totalPrice: 0,
          batches: []
        }
      }

      // 按FIFO计算成本
      let remainingQty = quantity
      let totalCost = 0
      const usedBatches: Array<{ quantity: number; unitPrice: number }> = []

      for (const batch of fifoBatches) {
        if (remainingQty <= 0) break

        const useQty = Math.min(remainingQty, batch.remaining_quantity)
        
        // 计算单价（优先使用unit_price，否则从total_price计算）
        let unitPrice = 0
        if (batch.unit_price !== null) {
          unitPrice = batch.unit_price
        } else if (batch.total_price !== null && batch.quantity > 0) {
          unitPrice = batch.total_price / batch.quantity
        }
        
        const batchCost = useQty * unitPrice

        totalCost += batchCost
        remainingQty -= useQty

        usedBatches.push({
          quantity: useQty,
          unitPrice: Number(unitPrice.toFixed(2))
        })

      }

      // 计算平均单价
      const actualQuantityUsed = quantity - remainingQty
      const avgUnitPrice = actualQuantityUsed > 0 ? totalCost / actualQuantityUsed : 0

      // 如果库存不足，使用平均价格
      if (remainingQty > 0) {
        // 使用库存平均价格补充剩余部分
        const { data: inventory } = await supabase
          .from('roleplay_inventory')
          .select('quantity, total_price')
          .eq('item_name', itemName)
          .eq('restaurant_id', restaurantId)
          .single()
        
        if (inventory && inventory.quantity > 0) {
          const avgPrice = inventory.total_price / inventory.quantity
          totalCost += remainingQty * avgPrice
          usedBatches.push({
            quantity: remainingQty,
            unitPrice: Number(avgPrice.toFixed(2))
          })
        }
      }

      const result = {
        unitPrice: Number((totalCost / quantity).toFixed(2)),
        totalPrice: Number(totalCost.toFixed(2)),
        batches: usedBatches
      }

      return result

    } catch (error) {
      return {
        unitPrice: 0,
        totalPrice: 0,
        batches: []
      }
    }
  }

  /**
   * 获取物品的最新采购单价（用于参考）
   */
  async getLatestPurchasePrice(
    itemName: string,
    restaurantId: string
  ): Promise<number> {
    try {
      // 从FIFO视图获取最新的采购记录
      const { data: latestPurchase } = await supabase
        .from('roleplay_inventory_fifo_view')
        .select('unit_price, total_price, quantity')
        .eq('item_name', itemName)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!latestPurchase) return 0
      
      // 优先使用unit_price，否则从total_price计算
      if (latestPurchase.unit_price !== null) {
        return latestPurchase.unit_price
      } else if (latestPurchase.total_price !== null && latestPurchase.quantity > 0) {
        return latestPurchase.total_price / latestPurchase.quantity
      }
      
      return 0

    } catch (error) {
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
      return { quantity: 0, totalValue: 0, avgUnitPrice: 0 }
    }
  }
}

// 导出单例
export const fifoCalculator = new FIFOCalculator()