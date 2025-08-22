/**
 * FIFO价格计算服务 (重定向到WAC)
 * Created: 2025-01-12
 * Updated: 2025-01-22 - Redirect to WAC calculator
 * Purpose: 为了保持向后兼容，将FIFO调用重定向到WAC计算器
 */

import { wacCalculator } from './wacCalculator'

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
   * 根据WAC原则计算物品的平均成本（保持接口兼容）
   * @param itemName 物品名称
   * @param quantity 需要计算的数量
   * @param restaurantId 餐厅ID
   * @returns 计算结果
   */
  async calculateFIFOPrice(
    itemName: string,
    quantity: number,
    restaurantId: string
  ): Promise<FIFOResult> {
    // 重定向到WAC计算器
    return wacCalculator.calculateWACPrice(itemName, quantity, restaurantId)
  }

  /**
   * 获取物品的加权平均单价（保持接口兼容）
   */
  async getLatestPurchasePrice(
    itemName: string,
    restaurantId: string
  ): Promise<number> {
    // 重定向到WAC计算器
    return wacCalculator.getWeightedAveragePrice(itemName, restaurantId)
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
    // 重定向到WAC计算器
    return wacCalculator.getInventoryValue(itemName, restaurantId)
  }
}

// 导出单例
export const fifoCalculator = new FIFOCalculator()