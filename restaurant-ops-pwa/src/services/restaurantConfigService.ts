/**
 * 餐厅配置服务
 * 统一管理餐厅相关配置，从Supabase获取数据
 * Created: 2025-08-02
 */

import { supabase } from './supabase'

interface RestaurantConfig {
  id: string
  name: string
  isActive: boolean
}

class RestaurantConfigService {
  private currentRestaurant: RestaurantConfig | null = null
  private initialized: boolean = false

  /**
   * 初始化餐厅配置
   * 优先从用户profile获取，其次从第一个活跃餐厅获取
   */
  async initialize(): Promise<RestaurantConfig | null> {
    try {
      // 先尝试获取当前用户信息
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // 尝试从用户profile获取餐厅ID
        const { data: userProfile } = await supabase
          .from('roleplay_users')
          .select('restaurant_id')
          .eq('id', user.id)
          .single()
        
        if (userProfile?.restaurant_id) {
          // 获取餐厅详情
          const { data: restaurant } = await supabase
            .from('roleplay_restaurants')
            .select('id, name, is_active')
            .eq('id', userProfile.restaurant_id)
            .single()
          
          if (restaurant) {
            this.currentRestaurant = {
              id: restaurant.id,
              name: restaurant.name,
              isActive: restaurant.is_active
            }
            this.initialized = true
            return this.currentRestaurant
          }
        }
      }
      
      // 如果没有用户或用户没有分配餐厅，获取第一个活跃的餐厅
      const { data: restaurants } = await supabase
        .from('roleplay_restaurants')
        .select('id, name, is_active')
        .eq('is_active', true)
        .order('created_at')
        .limit(1)
      
      if (restaurants && restaurants.length > 0) {
        this.currentRestaurant = {
          id: restaurants[0].id,
          name: restaurants[0].name,
          isActive: restaurants[0].is_active
        }
        this.initialized = true
        return this.currentRestaurant
      }
      
      console.error('[RestaurantConfigService] No active restaurant found')
      return null
      
    } catch (error) {
      console.error('[RestaurantConfigService] Error initializing:', error)
      return null
    }
  }

  /**
   * 获取当前餐厅配置
   * 如果未初始化，自动初始化
   */
  async getCurrentRestaurant(): Promise<RestaurantConfig | null> {
    if (!this.initialized) {
      await this.initialize()
    }
    return this.currentRestaurant
  }

  /**
   * 获取餐厅ID
   * 仅在需要快速访问且不需要完整配置时使用
   */
  async getRestaurantId(): Promise<string | null> {
    const restaurant = await this.getCurrentRestaurant()
    return restaurant?.id || null
  }

  /**
   * 获取餐厅名称
   */
  async getRestaurantName(): Promise<string | null> {
    const restaurant = await this.getCurrentRestaurant()
    return restaurant?.name || null
  }

  /**
   * 刷新餐厅配置
   */
  async refresh(): Promise<RestaurantConfig | null> {
    this.initialized = false
    this.currentRestaurant = null
    return await this.initialize()
  }

  /**
   * 获取所有活跃餐厅列表
   */
  async getActiveRestaurants(): Promise<RestaurantConfig[]> {
    try {
      const { data, error } = await supabase
        .from('roleplay_restaurants')
        .select('id, name, is_active')
        .eq('is_active', true)
        .order('name')
      
      if (error) throw error
      
      return data.map(r => ({
        id: r.id,
        name: r.name,
        isActive: r.is_active
      }))
    } catch (error) {
      console.error('[RestaurantConfigService] Error fetching restaurants:', error)
      return []
    }
  }

  /**
   * 设置当前餐厅（仅用于特殊场景，如餐厅选择器）
   */
  async setCurrentRestaurant(restaurantId: string): Promise<boolean> {
    try {
      const { data: restaurant } = await supabase
        .from('roleplay_restaurants')
        .select('id, name, is_active')
        .eq('id', restaurantId)
        .single()
      
      if (restaurant) {
        this.currentRestaurant = {
          id: restaurant.id,
          name: restaurant.name,
          isActive: restaurant.is_active
        }
        this.initialized = true
        return true
      }
      
      return false
    } catch (error) {
      console.error('[RestaurantConfigService] Error setting restaurant:', error)
      return false
    }
  }
}

// 创建单例
export const restaurantConfigService = new RestaurantConfigService()

// 导出便捷函数
export const getRestaurantId = () => restaurantConfigService.getRestaurantId()
export const getRestaurantName = () => restaurantConfigService.getRestaurantName()
export const getCurrentRestaurant = () => restaurantConfigService.getCurrentRestaurant()