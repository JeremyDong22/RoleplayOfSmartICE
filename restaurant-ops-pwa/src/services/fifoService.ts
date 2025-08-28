/**
 * FIFO (First In First Out) 库存成本计算服务
 * Created: 2025-08-23
 * Updated: 2025-08-26 - Disconnected from database, using placeholder data
 * Purpose: 实现基于FIFO的库存成本计算，逐步淘汰无价格的初始库存
 */

// Temporarily disconnected from database
// import { supabase } from './supabase'
// import { restaurantConfigService } from './restaurantConfigService'

interface FIFOBatch {
  record_id: string
  restaurant_id: string
  record_date: string
  receipt_date: string
  item_name: string
  quantity: number
  unit_price: number
  total_price: number
  unit: string
  batch_type: 'initial' | 'receipt'
  cumulative_quantity: number
  batch_sequence: number
}

interface FIFOCostResult {
  total_cost: number
  batches_used: Array<{
    batch_date: string
    batch_type: string
    consumed: number
    unit_price: number
    cost: number
  }>
  batches_detail: string
}

interface InventoryLossResult {
  loss_quantity: number
  receipts_quantity: number
  loss_cost: number
  loss_details: any[]
}

export class FIFOService {
  /**
   * 获取物品的所有FIFO批次（占位符）
   */
  async getFIFOBatches(itemName: string, restaurantId?: string): Promise<FIFOBatch[]> {
    // Return placeholder data
    return [
      {
        record_id: 'batch-1',
        restaurant_id: restaurantId || 'placeholder',
        record_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        receipt_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        item_name: itemName,
        quantity: 100,
        unit_price: 5,
        total_price: 500,
        unit: '个',
        batch_type: 'receipt',
        cumulative_quantity: 100,
        batch_sequence: 1
      },
      {
        record_id: 'batch-2',
        restaurant_id: restaurantId || 'placeholder',
        record_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        receipt_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        item_name: itemName,
        quantity: 50,
        unit_price: 5.5,
        total_price: 275,
        unit: '个',
        batch_type: 'receipt',
        cumulative_quantity: 150,
        batch_sequence: 2
      }
    ]
  }

  /**
   * 计算消耗成本（占位符）
   */
  async calculateConsumptionCost(
    itemName: string,
    consumptionQuantity: number,
    restaurantId?: string
  ): Promise<FIFOCostResult> {
    // Return placeholder calculation
    const unitPrice = 5.25 // Average price
    const totalCost = consumptionQuantity * unitPrice
    
    return {
      total_cost: totalCost,
      batches_used: [
        {
          batch_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          batch_type: 'receipt',
          consumed: Math.min(consumptionQuantity, 100),
          unit_price: 5,
          cost: Math.min(consumptionQuantity, 100) * 5
        }
      ],
      batches_detail: `使用批次: ${itemName} - ${consumptionQuantity}个`
    }
  }

  /**
   * 获取当前库存价值（占位符）
   */
  async getCurrentInventoryValue(itemName: string, restaurantId?: string): Promise<{
    total_value: number
    total_quantity: number
    unit_price: number
  }> {
    // Return placeholder value
    return {
      total_value: 400,
      total_quantity: 80,
      unit_price: 5
    }
  }

  /**
   * 获取库存损耗信息（占位符）
   */
  async getInventoryLoss(
    itemName: string,
    startDate: string,
    endDate: string,
    restaurantId?: string
  ): Promise<InventoryLossResult> {
    // Return placeholder loss data
    return {
      loss_quantity: 20,
      receipts_quantity: 50,
      loss_cost: 100,
      loss_details: []
    }
  }

  /**
   * 获取批次剩余库存（占位符）
   */
  async getBatchRemaining(itemName: string, restaurantId?: string): Promise<Array<{
    batch_id: string
    remaining_quantity: number
    unit_price: number
    remaining_value: number
  }>> {
    // Return placeholder remaining batches
    return [
      {
        batch_id: 'batch-1',
        remaining_quantity: 30,
        unit_price: 5,
        remaining_value: 150
      },
      {
        batch_id: 'batch-2',
        remaining_quantity: 50,
        unit_price: 5.5,
        remaining_value: 275
      }
    ]
  }
}

export const fifoService = new FIFOService()