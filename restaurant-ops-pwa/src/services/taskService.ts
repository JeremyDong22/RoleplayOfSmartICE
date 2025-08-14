/**
 * 任务数据库服务
 * 完全从 Supabase 数据库读取任务数据
 * 使用 Realtime 订阅任务更新
 */

import { supabase } from './supabase'
import { RealtimeChannel } from '@supabase/supabase-js'
import { restaurantConfigService } from './restaurantConfigService'
import { authService } from './authService'
import type { TaskTemplate, WorkflowPeriod } from '../types/task.types'

export interface DatabaseTask {
  id: string
  title: string
  description: string
  role_code: string
  period_id: string | null
  submission_type: string | null
  required_photos: number | null
  is_floating: boolean
  is_notice: boolean
  floating_type: 'daily' | 'anytime' | null
  prerequisite_periods: string[] | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  prerequisite_trigger: string | null
  linked_tasks: string[] | null
  auto_generated: boolean
  prerequisite_for: string[] | null
  samples: any | null  // 新的samples JSON结构
  manual_closing?: boolean  // 新增：标识是否为手动闭店任务
  structured_fields?: any  // 结构化字段配置
}

export interface DatabasePeriod {
  id: string
  name: string
  display_name: string
  start_time: string
  end_time: string
  is_event_driven: boolean
  display_order: number
  created_at: string
  updated_at: string
}

class TaskService {
  private tasksChannel: RealtimeChannel | null = null
  private periodsChannel: RealtimeChannel | null = null
  private tasksCache: Map<string, DatabaseTask[]> = new Map()
  private periodsCache: DatabasePeriod[] = []
  private listeners: Map<string, (data: any) => void> = new Map()
  private isInitialized: boolean = false
  private initializingPromise: Promise<boolean> | null = null

  /**
   * 初始化服务并订阅实时更新
   */
  async initialize(): Promise<boolean> {
    // If already initialized, return immediately
    if (this.isInitialized) {
      return true
    }
    
    // If initialization is in progress, wait for it
    if (this.initializingPromise) {
      return this.initializingPromise
    }
    
    // Start initialization
    this.initializingPromise = this._doInitialize()
    const result = await this.initializingPromise
    this.initializingPromise = null
    return result
  }
  
  private async _doInitialize(): Promise<boolean> {
    console.log('[TaskService] Starting initialization...')
    
    try {
      // Check if user is authenticated using Cookie-based auth (NOT Supabase Auth)
      // This checks our custom authentication from authService
      const currentUser = authService.getCurrentUser()
      if (!currentUser) {
        console.log('[TaskService] No auth session, skipping initialization')
        return false
      }
      
      // 加载初始数据
      const periodsLoaded = await this.loadPeriods()
      const tasksLoaded = await this.loadAllTasks()
      
      if (!periodsLoaded || !tasksLoaded) {
        console.warn('[TaskService] Some data could not be loaded, continuing with partial data')
        // 如果数据加载失败，返回false但不抛出错误，让应用继续运行
        return false
      }
      
      console.log('[TaskService] Initialized successfully')
      
      // Mark as initialized
      this.isInitialized = true
      
      // 启用实时订阅（延迟以避免网络拥堵）
      setTimeout(() => {
        this.subscribeToChanges()
      }, 2000)
      
      return true
    } catch (error) {
      console.error('[TaskService] Initialization error:', error)
      return false
    }
  }

  /**
   * 加载所有工作流期间
   * Updated: 2025-08-04 - Added restaurant-specific period loading
   */
  private async loadPeriods(retryCount = 0): Promise<boolean> {
    try {
      // Get current restaurant ID
      const restaurantId = await restaurantConfigService.getRestaurantId()
      
      if (!restaurantId) {
        // No restaurant ID available
        return false
      }
      
      const { data, error } = await supabase
        .from('roleplay_workflow_periods')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('display_order')

      if (error) {
        throw error
      }

      this.periodsCache = data || []
      return true
    } catch (error: any) {
      // Error loading periods
      
      // 如果是网络错误且还有重试次数，则重试
      if (retryCount < 3 && (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION'))) {
        // Retrying load periods
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))) // 递增延迟
        return this.loadPeriods(retryCount + 1)
      }
      
      return false
    }
  }

  /**
   * 加载所有任务
   * Updated: 2025-08-04 - Added restaurant-specific task loading
   */
  private async loadAllTasks(retryCount = 0): Promise<boolean> {
    try {
      // Get current restaurant ID
      const restaurantId = await restaurantConfigService.getRestaurantId()
      
      if (!restaurantId) {
        // No restaurant ID available for loading tasks
        return false
      }
      
      // 加载任务时，同时获取餐厅特定任务和全局任务
      const { data, error } = await supabase
        .from('roleplay_tasks')
        .select('*')
        .or(`restaurant_id.eq.${restaurantId},restaurant_id.is.null`)
        .order('sort_order')

      if (error) {
        throw error
      }

      // 按期间组织任务
      const tasksByPeriod = new Map<string, DatabaseTask[]>()
      
      data?.forEach((task) => {
        // 根据is_floating字段决定任务分组
        let periodId: string
        
        if (task.is_floating === true) {
          periodId = 'floating'
        } else if (task.period_id) {
          periodId = task.period_id
        } else {
          // 如果没有period_id且不是floating，跳过此任务
          return
        }
        
        if (!tasksByPeriod.has(periodId)) {
          tasksByPeriod.set(periodId, [])
        }
        tasksByPeriod.get(periodId)!.push(task)
      })

      this.tasksCache = tasksByPeriod
      return true
    } catch (error: any) {
      console.error('Error loading tasks:', {
        message: error.message || 'Unknown error',
        details: error.toString(),
        hint: error.hint || '',
        code: error.code || ''
      })
      
      // 如果是网络错误且还有重试次数，则重试
      if (retryCount < 3 && (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION'))) {
        console.log(`Retrying load tasks (attempt ${retryCount + 1}/3)...`)
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
        return this.loadAllTasks(retryCount + 1)
      }
      
      return false
    }
  }

  /**
   * 订阅实时更新
   */
  private subscribeToChanges() {
    // 订阅任务变化
    this.tasksChannel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'roleplay_tasks'
        },
        (payload) => {
          this.handleTaskChange(payload)
        }
      )
      .subscribe()

    // 订阅期间变化
    this.periodsChannel = supabase
      .channel('periods-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'roleplay_workflow_periods'
        },
        (payload) => {
          this.handlePeriodChange(payload)
        }
      )
      .subscribe()
  }

  /**
   * 处理任务变化
   */
  private async handleTaskChange(payload: any) {
    const { eventType, new: newTask, old: oldTask } = payload

    switch (eventType) {
      case 'INSERT':
      case 'UPDATE':
        // 更新缓存
        const periodId = newTask.period_id || 'floating'
        const tasks = this.tasksCache.get(periodId) || []
        const index = tasks.findIndex(t => t.id === newTask.id)
        
        if (index >= 0) {
          tasks[index] = newTask
        } else {
          tasks.push(newTask)
        }
        
        this.tasksCache.set(periodId, tasks)
        break

      case 'DELETE':
        // 从缓存中移除
        const oldPeriodId = oldTask.period_id || 'floating'
        const oldTasks = this.tasksCache.get(oldPeriodId) || []
        this.tasksCache.set(
          oldPeriodId,
          oldTasks.filter(t => t.id !== oldTask.id)
        )
        break
    }

    // 通知监听器
    this.notifyListeners('tasks', this.getWorkflowPeriods())
  }

  /**
   * 处理期间变化
   */
  private async handlePeriodChange(payload: any) {
    // 重新加载期间数据
    await this.loadPeriods()
    
    // 通知监听器
    this.notifyListeners('periods', this.getWorkflowPeriods())
  }

  /**
   * 将英文的 submission_type 映射为中文
   */
  private mapSubmissionTypeToChinese(submissionType: string | null): '拍照' | '录音' | '记录' | '列表' | null {
    if (!submissionType) return null
    
    const mapping: Record<string, '拍照' | '录音' | '记录' | '列表'> = {
      'photo': '拍照',
      'audio': '录音',
      'text': '记录',
      'list': '列表',
      'checkbox': '列表'  // checkbox也映射到列表
    }
    
    return mapping[submissionType] || null
  }

  /**
   * 根据角色代码获取部门
   * 可以在未来轻松扩展为从数据库查询
   */
  private getDepartmentByRole(roleCode: string): '前厅' | '后厨' {
    // 目前的业务规则：chef属于后厨，其他角色属于前厅
    // 未来可以扩展为从roleplay_roles表的department字段获取
    return roleCode === 'chef' ? '后厨' : '前厅'
  }

  /**
   * 转换数据库任务到应用格式
   */
  private convertTask(dbTask: DatabaseTask): TaskTemplate {
    // 使用函数获取部门，便于未来扩展
    const department = this.getDepartmentByRole(dbTask.role_code)
    
    return {
      id: dbTask.id,
      title: dbTask.title,
      description: dbTask.description || '',
      role: dbTask.role_code === 'manager' ? 'Manager' : 
            dbTask.role_code === 'chef' ? 'Chef' : 'DutyManager',
      department: department as '前厅' | '后厨',
      isNotice: dbTask.is_notice || false,
      uploadRequirement: this.mapSubmissionTypeToChinese(dbTask.submission_type),
      isFloating: dbTask.is_floating || false,
      floatingType: dbTask.floating_type as any,
      prerequisiteTrigger: dbTask.prerequisite_trigger as any,
      linkedTasks: dbTask.linked_tasks || undefined,
      autoGenerated: dbTask.auto_generated || false,
      samples: dbTask.samples,
      manualClosing: dbTask.manual_closing || false,  // 新增：传递手动闭店标识
      structuredFields: dbTask.structured_fields  // 传递结构化字段配置
    }
  }

  /**
   * 获取格式化的工作流期间（兼容现有代码）
   */
  getWorkflowPeriods(): WorkflowPeriod[] {
    return this.periodsCache.map(period => {
      const tasks = this.tasksCache.get(period.id) || []
      
      // 按角色分组任务，排除manual_closing任务（它们只作为按钮显示）
      const managerTasks = tasks
        .filter(t => t.role_code === 'manager' && !t.manual_closing)
        .map(t => this.convertTask(t))
      
      const chefTasks = tasks
        .filter(t => t.role_code === 'chef' && !t.manual_closing)
        .map(t => this.convertTask(t))
      
      const dutyManagerTasks = tasks
        .filter(t => t.role_code === 'duty_manager' && !t.manual_closing)
        .map(t => this.convertTask(t))

      const convertedPeriod = {
        id: period.id,
        name: period.name,
        displayName: period.display_name,
        startTime: period.start_time ? period.start_time.substring(0, 5) : '',  // 转换 "21:30:00" 为 "21:30"
        endTime: period.end_time ? period.end_time.substring(0, 5) : '',      // 转换 "08:00:00" 为 "08:00"
        isEventDriven: period.is_event_driven,
        tasks: {
          manager: managerTasks,
          chef: chefTasks,
          ...(dutyManagerTasks.length > 0 && { dutyManager: dutyManagerTasks })
        }
      }
      
      // Debug log for closing period
      if (period.name === '收市与打烊') {
        // Converting closing period
      }
      
      return convertedPeriod
    })
  }

  /**
   * 获取浮动任务
   */
  getFloatingTasks(role?: string): TaskTemplate[] {
    const floatingTasks = this.tasksCache.get('floating') || []
    
    const result = floatingTasks
      .filter(t => (!role || t.role_code === role.toLowerCase()) && !t.manual_closing)
      .map(t => this.convertTask(t))
    
    return result
  }

  /**
   * 获取手动闭店任务（特殊任务，只作为按钮显示）
   */
  getManualClosingTask(role?: string): TaskTemplate | null {
    // 从所有任务中查找manual_closing任务
    for (const [, tasks] of this.tasksCache) {
      const manualClosingTask = tasks.find(t => 
        t.manual_closing === true && 
        (!role || t.role_code === role.toLowerCase())
      )
      if (manualClosingTask) {
        return this.convertTask(manualClosingTask)
      }
    }
    return null
  }

  /**
   * 获取特定期间的任务
   */
  getPeriodTasks(periodId: string, role?: string): TaskTemplate[] {
    const tasks = this.tasksCache.get(periodId) || []
    
    return tasks
      .filter(t => (!role || t.role_code === role.toLowerCase()) && !t.manual_closing)
      .map(t => this.convertTask(t))
  }

  /**
   * 监听数据变化
   */
  subscribe(event: string, callback: (data: any) => void) {
    const id = `${event}-${Date.now()}`
    this.listeners.set(id, callback)
    return () => this.listeners.delete(id)
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(event: string, data: any) {
    this.listeners.forEach((callback, id) => {
      if (id.startsWith(event)) {
        callback(data)
      }
    })
  }

  /**
   * 手动刷新所有数据
   */
  async refresh(): Promise<boolean> {
    // Manual refresh triggered
    
    // 重新加载所有数据
    const periodsLoaded = await this.loadPeriods()
    const tasksLoaded = await this.loadAllTasks()
    
    if (periodsLoaded && tasksLoaded) {
      // 通知所有监听器数据已更新
      this.notifyListeners('refresh', this.getWorkflowPeriods())
      return true
    }
    
    return false
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.tasksChannel?.unsubscribe()
    this.periodsChannel?.unsubscribe()
    this.tasksCache.clear()
    this.periodsCache = []
    this.listeners.clear()
  }
}

// 创建单例
export const taskService = new TaskService()

// 导出兼容函数（方便迁移）
export const getWorkflowPeriods = () => taskService.getWorkflowPeriods()
export const getFloatingTasks = (role?: string) => taskService.getFloatingTasks(role)
export const getManualClosingTask = (role?: string) => taskService.getManualClosingTask(role)