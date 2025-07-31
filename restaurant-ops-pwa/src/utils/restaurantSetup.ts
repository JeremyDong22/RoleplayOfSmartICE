// 餐厅设置工具
// 用于初始化餐厅相关配置

import { supabase } from '../services/supabase'

export async function initializeRestaurant() {
  try {
    // 检查是否已设置餐厅ID
    const existingId = localStorage.getItem('selectedRestaurantId')
    if (existingId && existingId !== 'default-restaurant') {
      return existingId
    }

    // 获取野百灵餐厅信息
    const { data, error } = await supabase
      .from('roleplay_restaurants')
      .select('id, name')
      .eq('name', '野百灵')
      .single()

    if (error) {
      console.error('Failed to fetch restaurant:', error)
      // 使用硬编码的ID作为后备
      const restaurantId = 'e01868e3-5cff-4e89-9c5e-a0d4ae342b1a'
      localStorage.setItem('selectedRestaurantId', restaurantId)
      return restaurantId
    }

    if (data) {
      localStorage.setItem('selectedRestaurantId', data.id)
      localStorage.setItem('selectedRestaurantName', data.name)
      console.log('[RestaurantSetup] Initialized restaurant:', data.name, data.id)
      return data.id
    }

    // 如果没有找到餐厅，使用默认值
    return 'default-restaurant'
  } catch (error) {
    console.error('[RestaurantSetup] Error initializing restaurant:', error)
    // 使用硬编码的ID作为后备
    const restaurantId = 'e01868e3-5cff-4e89-9c5e-a0d4ae342b1a'
    localStorage.setItem('selectedRestaurantId', restaurantId)
    return restaurantId
  }
}

// Get current restaurant ID
export function getRestaurantId(): string {
  const id = localStorage.getItem('selectedRestaurantId')
  if (!id || id === 'default-restaurant') {
    // Return the hardcoded UUID if no valid ID is found
    return 'e01868e3-5cff-4e89-9c5e-a0d4ae342b1a'
  }
  return id
}