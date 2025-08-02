/**
 * 餐厅设置工具 - 已迁移到 restaurantConfigService
 * 保留此文件仅为向后兼容
 * @deprecated 请使用 restaurantConfigService
 */

import { restaurantConfigService } from '../services/restaurantConfigService'

/**
 * @deprecated 使用 restaurantConfigService.initialize()
 */
export async function initializeRestaurant() {
  const config = await restaurantConfigService.initialize()
  return config?.id || null
}

/**
 * @deprecated 使用 restaurantConfigService.getRestaurantId()
 */
export async function getRestaurantId(): Promise<string | null> {
  return await restaurantConfigService.getRestaurantId()
}