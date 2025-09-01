// Sample Manager Service
// Service for managing task samples in the database
// Updated: 2025-09-02 - Added caching for restaurant data to improve loading performance

import { supabase } from './supabase'

// Cache for restaurant data
interface CacheEntry<T> {
  data: T
  timestamp: number
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes cache
const cache: Map<string, CacheEntry<any>> = new Map()

export class SampleManagerService {
  // Fetch all restaurants with caching
  static async getRestaurants() {
    const cacheKey = 'restaurants'
    const cached = cache.get(cacheKey)
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }
    
    // Fetch from database with timeout
    const { data, error } = await supabase
      .from('roleplay_restaurants')
      .select('id, name, city, address, icon, is_active')
      .eq('is_active', true)
      .order('name')
      .abortSignal(AbortSignal.timeout(10000)) // 10 second timeout

    if (error) throw error
    
    // Cache the result
    if (data) {
      cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      })
    }
    
    return data
  }

  // Fetch all roles with caching
  static async getRoles() {
    const cacheKey = 'roles'
    const cached = cache.get(cacheKey)
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }
    
    const { data, error } = await supabase
      .from('roleplay_roles')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .abortSignal(AbortSignal.timeout(10000)) // 10 second timeout

    if (error) throw error
    
    // Cache the result
    if (data) {
      cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      })
    }
    
    return data
  }

  // Fetch workflow periods
  static async getPeriods(restaurantId?: string) {
    let query = supabase
      .from('roleplay_workflow_periods')
      .select('*')
    
    if (restaurantId) {
      query = query.eq('restaurant_id', restaurantId)
    }
    
    const { data, error } = await query.order('display_order')

    if (error) throw error
    return data
  }

  // Fetch tasks for a specific role and period
  static async getTasks(roleCode: string, periodId?: string, restaurantId?: string) {
    let query = supabase
      .from('roleplay_tasks')
      .select('*')
      .eq('role_code', roleCode)
      .eq('is_active', true)

    if (periodId) {
      query = query.eq('period_id', periodId)
    }

    if (restaurantId) {
      query = query.or(`restaurant_id.eq.${restaurantId},restaurant_id.is.null`)
    }

    const { data, error } = await query.order('sort_order')

    if (error) throw error
    return data
  }

  // Get task samples
  static async getTaskSamples(taskId: string) {
    const { data, error } = await supabase
      .from('roleplay_tasks')
      .select('samples')
      .eq('id', taskId)
      .single()

    if (error) throw error
    return data?.samples || { samples: [] }
  }

  // Update task samples
  static async updateTaskSamples(taskId: string, samples: any) {
    const { data, error } = await supabase
      .from('roleplay_tasks')
      .update({ 
        samples: samples,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)

    if (error) throw error
    return data
  }

  // Upload image to storage
  static async uploadImage(file: File, path: string) {
    const fileName = `${Date.now()}-${file.name}`
    const fullPath = `${path}/${fileName}`

    const { data, error } = await supabase.storage
      .from('RolePlay')
      .upload(fullPath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) throw error

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('RolePlay')
      .getPublicUrl(fullPath)

    return publicUrl
  }

  // Delete image from storage
  static async deleteImage(url: string) {
    // Extract path from URL
    const urlParts = url.split('/storage/v1/object/public/RolePlay/')
    if (urlParts.length !== 2) {
      console.warn('Invalid storage URL format:', url)
      return { success: false, error: 'Invalid URL format' }
    }

    const path = urlParts[1]
    const { error } = await supabase.storage
      .from('RolePlay')
      .remove([path])

    if (error) {
      console.error('Failed to delete image:', error)
      throw error
    }
    
    return { success: true }
  }

  // Create a new task
  static async createTask(task: {
    title: string
    description?: string
    role_code: string
    period_id?: string
    restaurant_id?: string
    submission_type?: string
    samples?: any
  }) {
    const { data, error } = await supabase
      .from('roleplay_tasks')
      .insert({
        ...task,
        id: crypto.randomUUID(),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Delete a task
  static async deleteTask(taskId: string) {
    const { error } = await supabase
      .from('roleplay_tasks')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)

    if (error) throw error
  }
  
  // Clear cache
  static clearCache() {
    cache.clear()
  }

  // Update task details
  static async updateTask(taskId: string, updates: any) {
    const { data, error } = await supabase
      .from('roleplay_tasks')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single()

    if (error) throw error
    return data
  }
}