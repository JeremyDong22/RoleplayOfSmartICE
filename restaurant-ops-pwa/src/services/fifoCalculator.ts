/**
 * FIFO价格计算服务
 * Created: 2025-01-12
 * Purpose: 实现先进先出的价格计算逻辑，用于损耗盘点时自动计算成本
 */

import { supabase } from './supabase'

interface PriceBatch {
  id: string
  unit_price: number
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
      // 1. 获取inventory item ID
      const { data: inventoryItem, error: invError } = await supabase
        .from('roleplay_inventory')
        .select('id')
        .eq('item_name', itemName)
        .eq('restaurant_id', restaurantId)
        .single()

      if (invError || !inventoryItem) {
        console.error('[FIFOCalculator] Failed to find inventory item:', invError)
        return {
          unitPrice: 0,
          totalPrice: 0,
          batches: []
        }
      }

      // 2. 获取价格历史（按FIFO顺序）
      const { data: priceHistory, error: histError } = await supabase
        .from('roleplay_inventory_price_history')
        .select('id, unit_price, remaining_quantity, created_at')
        .eq('inventory_item_id', inventoryItem.id)
        .eq('transaction_type', 'purchase')
        .gt('remaining_quantity', 0)
        .order('created_at', { ascending: true }) // FIFO: 最早的先出

      if (histError) {
        console.error('[FIFOCalculator] Failed to fetch price history:', histError)
        return {
          unitPrice: 0,
          totalPrice: 0,
          batches: []
        }
      }

      if (!priceHistory || priceHistory.length === 0) {
        console.warn('[FIFOCalculator] No price history found for:', itemName)
        return {
          unitPrice: 0,
          totalPrice: 0,
          batches: []
        }
      }

      // 3. 按FIFO计算成本
      let remainingQty = quantity
      let totalCost = 0
      const usedBatches: Array<{ quantity: number; unitPrice: number }> = []

      for (const batch of priceHistory) {
        if (remainingQty <= 0) break

        const useQty = Math.min(remainingQty, batch.remaining_quantity)
        const batchCost = useQty * batch.unit_price

        totalCost += batchCost
        remainingQty -= useQty

        usedBatches.push({
          quantity: useQty,
          unitPrice: batch.unit_price
        })

        console.log(`[FIFOCalculator] Using batch: ${useQty} @ ¥${batch.unit_price} = ¥${batchCost}`)
      }

      // 4. 计算平均单价
      const actualQuantityUsed = quantity - remainingQty
      const avgUnitPrice = actualQuantityUsed > 0 ? totalCost / actualQuantityUsed : 0

      // 如果库存不足，给出警告
      if (remainingQty > 0) {
        console.warn(`[FIFOCalculator] Insufficient inventory for ${itemName}. Short by ${remainingQty} units`)
      }

      const result = {
        unitPrice: Number(avgUnitPrice.toFixed(2)),
        totalPrice: Number(totalCost.toFixed(2)),
        batches: usedBatches
      }

      console.log('[FIFOCalculator] Calculation result:', result)
      return result

    } catch (error) {
      console.error('[FIFOCalculator] Error calculating FIFO price:', error)
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
      // 获取inventory item ID
      const { data: inventoryItem } = await supabase
        .from('roleplay_inventory')
        .select('id')
        .eq('item_name', itemName)
        .eq('restaurant_id', restaurantId)
        .single()

      if (!inventoryItem) return 0

      // 获取最新的采购记录
      const { data: latestPrice } = await supabase
        .from('roleplay_inventory_price_history')
        .select('unit_price')
        .eq('inventory_item_id', inventoryItem.id)
        .eq('transaction_type', 'purchase')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      return latestPrice?.unit_price || 0

    } catch (error) {
      console.error('[FIFOCalculator] Error getting latest price:', error)
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
      console.error('[FIFOCalculator] Error getting inventory value:', error)
      return { quantity: 0, totalValue: 0, avgUnitPrice: 0 }
    }
  }
}

// 导出单例
export const fifoCalculator = new FIFOCalculator()