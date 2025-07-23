/**
 * 任务数据库服务
 * 完全从 Supabase 数据库读取任务数据
 * 使用 Realtime 订阅任务更新
 */

import { supabase } from './supabase'
import { RealtimeChannel } from '@supabase/supabase-js'
import type { TaskTemplate, WorkflowPeriod } from '../utils/workflowParser'

export interface DatabaseTask {
  id: string
  task_code: string
  task_name: string
  task_description: string
  role_code: string
  department: string
  period_id: string
  upload_requirement: string | null
  is_notice: boolean
  is_floating: boolean
  floating_type: 'daily' | 'anytime' | null
  prerequisite_trigger: string | null
  linked_tasks: string[] | null
  auto_generated: boolean
  sort_order: number
  created_at: string
  updated_at: string
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

  /**
   * 初始化服务并订阅实时更新
   */
  async initialize() {
    // 加载初始数据
    await this.loadPeriods()
    await this.loadAllTasks()
    
    // 设置实时订阅
    this.subscribeToChanges()
  }

  /**
   * 加载所有工作流期间
   */
  private async loadPeriods() {
    const { data, error } = await supabase
      .from('roleplay_workflow_periods')
      .select('*')
      .order('display_order')

    if (error) {
      console.error('Error loading periods:', error)
      return
    }

    this.periodsCache = data || []
  }

  /**
   * 加载所有任务
   */
  private async loadAllTasks() {
    // 先检查用户认证状态
    const { data: { user } } = await supabase.auth.getUser()
    console.log('Current user:', user?.email, user?.id)
    
    const { data, error } = await supabase
      .from('roleplay_tasks')
      .select('*')
      .order('sort_order')

    if (error) {
      console.error('Error loading tasks:', error)
      return
    }
    
    console.log('=== Raw tasks from database ===')
    console.log('Total tasks loaded:', data?.length)
    console.log('Floating tasks:', data?.filter(t => t.is_floating))
    console.log('Tasks with null period_id:', data?.filter(t => !t.period_id))
    console.log('Sample task data:', data?.[0])
    
    // 检查是否有特定的浮动任务
    const floatingReceivingManager = data?.find(t => t.id === 'floating-receiving-manager')
    console.log('floating-receiving-manager task:', floatingReceivingManager)
    
    // 打印所有任务的 ID 和 is_floating 状态
    console.log('All task IDs and floating status:', data?.map(t => ({ id: t.id, is_floating: t.is_floating })))

    // 按期间组织任务
    const tasksByPeriod = new Map<string, DatabaseTask[]>()
    
    data?.forEach(task => {
      const periodId = task.period_id || 'floating'
      if (!tasksByPeriod.has(periodId)) {
        tasksByPeriod.set(periodId, [])
      }
      tasksByPeriod.get(periodId)!.push(task)
    })

    // Debug: 打印浮动任务
    console.log('=== TaskService Debug ===')
    console.log('Floating tasks in cache:', tasksByPeriod.get('floating'))
    console.log('All cache keys:', Array.from(tasksByPeriod.keys()))

    this.tasksCache = tasksByPeriod
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
   * 转换数据库任务到应用格式
   */
  private convertTask(dbTask: DatabaseTask): TaskTemplate {
    return {
      id: dbTask.task_code,
      title: dbTask.task_name,
      description: dbTask.task_description,
      role: dbTask.role_code === 'manager' ? 'Manager' : 
            dbTask.role_code === 'chef' ? 'Chef' : 'DutyManager',
      department: dbTask.department as '前厅' | '后厨',
      isNotice: dbTask.is_notice,
      uploadRequirement: dbTask.upload_requirement as any,
      isFloating: dbTask.is_floating,
      floatingType: dbTask.floating_type as any,
      prerequisiteTrigger: dbTask.prerequisite_trigger as any,
      linkedTasks: dbTask.linked_tasks,
      autoGenerated: dbTask.auto_generated
    }
  }

  /**
   * 获取格式化的工作流期间（兼容现有代码）
   */
  getWorkflowPeriods(): WorkflowPeriod[] {
    return this.periodsCache.map(period => {
      const tasks = this.tasksCache.get(period.id) || []
      
      // 按角色分组任务
      const managerTasks = tasks
        .filter(t => t.role_code === 'manager')
        .map(t => this.convertTask(t))
      
      const chefTasks = tasks
        .filter(t => t.role_code === 'chef')
        .map(t => this.convertTask(t))
      
      const dutyManagerTasks = tasks
        .filter(t => t.role_code === 'duty_manager')
        .map(t => this.convertTask(t))

      return {
        id: period.id,
        name: period.name,
        displayName: period.display_name,
        startTime: period.start_time,
        endTime: period.end_time,
        isEventDriven: period.is_event_driven,
        tasks: {
          manager: managerTasks,
          chef: chefTasks,
          ...(dutyManagerTasks.length > 0 && { dutyManager: dutyManagerTasks })
        }
      }
    })
  }

  /**
   * 获取浮动任务
   */
  getFloatingTasks(role?: string): TaskTemplate[] {
    const floatingTasks = this.tasksCache.get('floating') || []
    
    console.log('=== getFloatingTasks Debug ===')
    console.log('Role filter:', role)
    console.log('Raw floating tasks:', floatingTasks)
    console.log('After role filter:', floatingTasks.filter(t => !role || t.role_code === role.toLowerCase()))
    
    return floatingTasks
      .filter(t => !role || t.role_code === role.toLowerCase())
      .map(t => this.convertTask(t))
  }

  /**
   * 获取特定期间的任务
   */
  getPeriodTasks(periodId: string, role?: string): TaskTemplate[] {
    const tasks = this.tasksCache.get(periodId) || []
    
    return tasks
      .filter(t => !role || t.role_code === role.toLowerCase())
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