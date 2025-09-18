/**
 * 餐厅配置服务
 * 统一管理餐厅相关配置，从Supabase获取数据
 * Created: 2025-08-02
 * Updated: 2025-01-13 - 优化缓存逻辑，避免重复初始化
 * Updated: 2025-01-05 - 移除所有 console.log 语句，保留 console.error 用于生产环境错误处理
 */

import { getSupabase } from './supabase'
import Cookies from 'js-cookie'

interface RestaurantConfig {
  id: string
  name: string
  isActive: boolean
}

class RestaurantConfigService {
  private static instance: RestaurantConfigService | null = null;
  private currentRestaurant: RestaurantConfig | null = null
  private initialized: boolean = false
  private initializationPromise: Promise<RestaurantConfig | null> | null = null
  
  private constructor() {
    // Private constructor for singleton
  }
  
  static getInstance(): RestaurantConfigService {
    if (!RestaurantConfigService.instance) {
      RestaurantConfigService.instance = new RestaurantConfigService();
    }
    return RestaurantConfigService.instance;
  }

  /**
   * 初始化餐厅配置
   * 优先从用户profile获取，其次从第一个活跃餐厅获取
   */
  async initialize(): Promise<RestaurantConfig | null> {
    try {
      // 如果已经初始化并有餐厅配置，直接返回缓存
      if (this.initialized && this.currentRestaurant) {
        return this.currentRestaurant
      }

      // 如果正在初始化中，返回现有的Promise避免重复调用
      if (this.initializationPromise) {
        return this.initializationPromise
      }

      // 开始新的初始化
      this.initializationPromise = this._doInitialize()
      const result = await this.initializationPromise
      this.initializationPromise = null
      return result

    } catch (error) {
      console.error('[RestaurantConfigService] Error in initialize:', error)
      this.initializationPromise = null
      return this.currentRestaurant
    }
  }

  /**
   * 实际的初始化逻辑
   */
  private async _doInitialize(): Promise<RestaurantConfig | null> {
    const startTime = performance.now()
    // console.log('[PERF RestaurantConfig] Initialization started')
    try {
      // 直接从 Cookies 获取用户信息，避免循环依赖
      const userId = Cookies.get('userId')
      const restaurantId = Cookies.get('restaurantId')
      
      // 如果没有认证用户，静默返回
      if (!userId) {
        // 不输出日志，避免重复日志
        return null
      }
      
      // 首先检查用户是否有餐厅ID
      if (restaurantId) {
        // console.log(`[PERF RestaurantConfig] Found restaurant ID in cookies: ${restaurantId}`)
        // 获取餐厅详情
        const queryStartTime = performance.now()
        const { data: restaurant, error: restaurantError } = await getSupabase()
          .from('roleplay_restaurants')
          .select('id, name, is_active')
          .eq('id', restaurantId)
          .single()
        // console.log(`[PERF RestaurantConfig] Restaurant query completed in ${performance.now() - queryStartTime}ms`)
        
        if (restaurantError) {
        }
        
        if (restaurant) {
          this.currentRestaurant = {
            id: restaurant.id,
            name: restaurant.name,
            isActive: restaurant.is_active
          }
          this.initialized = true
          console.log(`[PERF RestaurantConfig] Total initialization time: ${performance.now() - startTime}ms`)
          return this.currentRestaurant
        }
      }
      
      // 如果用户没有分配餐厅，尝试从用户profile获取
      if (userId) {
        // console.log('[PERF RestaurantConfig] No restaurant ID in cookies, checking user profile')
        const profileStartTime = performance.now()
        const { data: userProfile, error: profileError } = await getSupabase()
          .from('roleplay_users')
          .select('restaurant_id')
          .eq('id', userId)
          .single()
        // console.log(`[PERF RestaurantConfig] User profile query completed in ${performance.now() - profileStartTime}ms`)
        
        if (profileError) {
        }
        
        if (userProfile?.restaurant_id) {
          // 获取餐厅详情
          const { data: restaurant, error: restaurantError } = await getSupabase()
            .from('roleplay_restaurants')
            .select('id, name, is_active')
            .eq('id', userProfile.restaurant_id)
            .single()
          
          if (restaurantError) {
            }
          
          if (restaurant) {
            this.currentRestaurant = {
              id: restaurant.id,
              name: restaurant.name,
              isActive: restaurant.is_active
            }
            this.initialized = true
            // console.log(`[PERF RestaurantConfig] Total initialization time (from user profile): ${performance.now() - startTime}ms`)
            return this.currentRestaurant
          }
        }
      }
      
      // 如果没有用户或用户没有分配餐厅，获取第一个活跃的餐厅
      const { data: restaurants, error: restaurantsError } = await getSupabase()
        .from('roleplay_restaurants')
        .select('id, name, is_active')
        .eq('is_active', true)
        .order('created_at')
        .limit(1)
      
      if (restaurantsError) {
        // 如果是认证错误，静默返回null
        if (restaurantsError.message?.includes('access control') || restaurantsError.message?.includes('CORS')) {
          return null
        }
        console.error('[RestaurantConfigService] Error fetching restaurants:', restaurantsError)
        return null
      }
      
      if (restaurants && restaurants.length > 0) {
        this.currentRestaurant = {
          id: restaurants[0].id,
          name: restaurants[0].name,
          isActive: restaurants[0].is_active
        }
        this.initialized = true
        return this.currentRestaurant
      }
      
      // 如果没有找到任何餐厅，返回null而不是硬编码默认值
      return null
      
    } catch (error: any) {
      console.error('[RestaurantConfigService] Error initializing:', error)
      return null
    }
  }

  /**
   * 获取当前餐厅配置
   * 如果未初始化，自动初始化
   */
  async getCurrentRestaurant(): Promise<RestaurantConfig | null> {
    // 总是检查缓存，避免重复初始化
    if (this.initialized && this.currentRestaurant) {
      return this.currentRestaurant
    }
    
    // 如果没有缓存，尝试初始化
    return await this.initialize()
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
      const { data, error } = await getSupabase()
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
      const { data: restaurant } = await getSupabase()
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

// Export singleton getter to avoid immediate instantiation
export const getRestaurantConfigService = () => RestaurantConfigService.getInstance();

// For backward compatibility - use Proxy for truly lazy loading
export const restaurantConfigService = new Proxy({} as RestaurantConfigService, {
  get(target, prop) {
    const instance = RestaurantConfigService.getInstance();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
});

// 导出便捷函数
export const getRestaurantId = () => getRestaurantConfigService().getRestaurantId()
export const getRestaurantName = () => getRestaurantConfigService().getRestaurantName()
export const getCurrentRestaurant = () => getRestaurantConfigService().getCurrentRestaurant()