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
    console.log('\n🚀 ========== TaskService.initialize START ==========')
    
    // 加载初始数据
    console.log('📋 Loading periods...')
    await this.loadPeriods()
    console.log(`✅ Periods loaded: ${this.periodsCache.length}`)
    
    console.log('📋 Loading tasks...')
    await this.loadAllTasks()
    console.log(`✅ Tasks loaded into ${this.tasksCache.size} groups`)
    
    // 暂时禁用实时订阅，排查问题
    // setTimeout(() => {
    //   this.subscribeToChanges()
    // }, 1000)
    
    console.log('🎉 ========== TaskService.initialize COMPLETE ==========\n')
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
    console.log('\n========== TaskService.loadAllTasks START ==========')
    
    // 先检查用户认证状态
    const { data: { user } } = await supabase.auth.getUser()
    console.log('1. Current user:', user?.email)
    
    const { data, error } = await supabase
      .from('roleplay_tasks')
      .select('*')
      .order('sort_order')

    if (error) {
      console.error('2. ERROR loading tasks:', error)
      return
    }
    
    console.log('2. Database query successful')
    console.log('   - Total tasks:', data?.length)
    console.log('   - Floating tasks:', data?.filter(t => t.is_floating === true).map(t => ({
      id: t.id,
      title: t.title,
      is_floating: t.is_floating,
      period_id: t.period_id
    })))

    // 按期间组织任务
    const tasksByPeriod = new Map<string, DatabaseTask[]>()
    
    console.log('3. Organizing tasks by period...')
    let floatingCount = 0
    let periodCount = 0
    
    data?.forEach((task, index) => {
      // 根据is_floating字段决定任务分组
      let periodId: string
      
      if (task.is_floating === true) {
        periodId = 'floating'
        floatingCount++
        console.log(`   - Task ${index}: ${task.id} -> floating (is_floating=${task.is_floating})`)
      } else if (task.period_id) {
        periodId = task.period_id
        periodCount++
      } else {
        // 如果没有period_id且不是floating，可能是数据问题
        console.warn(`   - Task ${index}: ${task.id} -> SKIPPED (no period_id and not floating)`)
        return // 跳过此任务
      }
      
      if (!tasksByPeriod.has(periodId)) {
        tasksByPeriod.set(periodId, [])
      }
      tasksByPeriod.get(periodId)!.push(task)
    })

    console.log('4. Task organization complete:')
    console.log(`   - Floating tasks: ${floatingCount}`)
    console.log(`   - Period tasks: ${periodCount}`)
    console.log(`   - Cache keys: ${Array.from(tasksByPeriod.keys()).join(', ')}`)
    
    // 详细打印floating组的内容
    const floatingGroup = tasksByPeriod.get('floating') || []
    console.log(`5. Floating group details (${floatingGroup.length} tasks):`)
    floatingGroup.forEach(task => {
      console.log(`   - ${task.id}: ${task.title} (role: ${task.role_code})`)
    })

    this.tasksCache = tasksByPeriod
    console.log('========== TaskService.loadAllTasks END ==========\n')
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
    // 根据role_code确定部门
    const department = dbTask.role_code === 'chef' ? '后厨' : '前厅'
    
    return {
      id: dbTask.id,
      title: dbTask.title,
      description: dbTask.description || '',
      role: dbTask.role_code === 'manager' ? 'Manager' : 
            dbTask.role_code === 'chef' ? 'Chef' : 'DutyManager',
      department: department as '前厅' | '后厨',
      isNotice: dbTask.is_notice || false,
      uploadRequirement: dbTask.submission_type as any,
      isFloating: dbTask.is_floating || false,
      floatingType: dbTask.floating_type as any,
      prerequisiteTrigger: dbTask.prerequisite_trigger as any,
      linkedTasks: dbTask.linked_tasks,
      autoGenerated: dbTask.auto_generated || false
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
    console.log('\n========== TaskService.getFloatingTasks START ==========')
    console.log('1. Role filter:', role)
    console.log('2. Cache status:')
    console.log(`   - Total cache keys: ${this.tasksCache.size}`)
    console.log(`   - Has 'floating' key: ${this.tasksCache.has('floating')}`)
    
    const floatingTasks = this.tasksCache.get('floating') || []
    console.log(`3. Floating tasks from cache: ${floatingTasks.length} tasks`)
    
    if (floatingTasks.length > 0) {
      console.log('4. Raw floating tasks:')
      floatingTasks.forEach(task => {
        console.log(`   - ${task.id}: ${task.title} (role: ${task.role_code}, is_floating: ${task.is_floating})`)
      })
    }
    
    const filteredTasks = floatingTasks.filter(t => !role || t.role_code === role.toLowerCase())
    console.log(`5. After role filter: ${filteredTasks.length} tasks`)
    
    const result = filteredTasks.map(t => this.convertTask(t))
    console.log(`6. After conversion: ${result.length} tasks`)
    
    if (result.length > 0) {
      console.log('7. Converted tasks:')
      result.forEach(task => {
        console.log(`   - ${task.id}: ${task.title} (role: ${task.role}, isFloating: ${task.isFloating})`)
      })
    }
    
    console.log('========== TaskService.getFloatingTasks END ==========\n')
    return result
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