// CEO Dashboard 数据服务
// Created: 2025-08-07
// 负责获取CEO仪表板所需的所有数据，完全基于数据库

import { supabase } from './supabase';
import { format, parseISO, startOfDay, isAfter, isBefore } from 'date-fns';

// 数据类型定义
export interface CEOTaskDetail {
  id: string;
  task_id: string;
  task_title: string;
  user_id: string;
  user_name: string;
  role_name: string;
  submission_type: string;
  text_content?: string;
  photo_urls?: string[];
  submission_metadata?: any;
  created_at: string;
  is_late: boolean;
  makeup_reason?: string;  // 补救原因
  has_errors?: boolean;
  scheduled_time?: string;
  actual_time?: string;
  period_id: string;
  period_name: string;
  status: 'completed' | 'pending' | 'missing';
}

export interface CEOEmployeeStat {
  user_id: string;
  user_name: string;
  role_name: string;
  completed_tasks: number;
  total_tasks: number;
  on_time_rate: number;
  late_count: number;
}

export interface FloatingTaskInfo {
  task_id: string;
  task_title: string;
  submission_count: number;
  submission_type: string;
}

export interface CEORestaurantData {
  restaurant_id: string;
  restaurant_name: string;
  total_tasks: number;
  completed_tasks: number;
  on_time_rate: number;
  current_period: string;
  current_period_id: string;
  task_details: CEOTaskDetail[];
  tasks_by_period: Record<string, CEOTaskDetail[]>;
  employee_stats: CEOEmployeeStat[];
  missing_tasks_count: number;
  late_tasks_count: number;
  error_tasks_count: number;
  is_manually_closed: boolean;
  manually_closed_at?: string;
  floating_task_info: FloatingTaskInfo[];
}

export interface CEOPeriod {
  id: string;
  name: string;
  display_name: string;
  start_time: string;
  end_time: string;
  display_order: number;
  warning_count?: number;  // 该时段的警告数量
  error_count?: number;    // 该时段的错误数量
}

export interface CEOAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  restaurant_id: string;
  restaurant_name: string;
  department: '前厅' | '后厨';
  message: string;
  count: number;
  timestamp: string;
}

export interface CombinedRestaurantData {
  restaurant_id: string;
  restaurant_name: string;
  total_missing_tasks: number;
  total_late_tasks: number;
  total_error_tasks: number;
  front_office_stats?: {
    missing_tasks_count: number;
    late_tasks_count: number;
    error_tasks_count: number;
  };
  kitchen_stats?: {
    missing_tasks_count: number;
    late_tasks_count: number;
    error_tasks_count: number;
  };
}

class CEODashboardService {
  // 获取当前时间对应的时段
  private getCurrentPeriod(periods: CEOPeriod[]): CEOPeriod | null {
    const now = new Date();
    const currentTime = format(now, 'HH:mm:ss');
    
    return periods.find(period => {
      return currentTime >= period.start_time && currentTime <= period.end_time;
    }) || null;
  }

  // 获取餐厅的时段
  async getPeriods(restaurantId?: string): Promise<CEOPeriod[]> {
    try {
      let query = supabase
        .from('roleplay_workflow_periods')
        .select('*')
        .order('display_order');
      
      // 如果提供了餐厅ID，只获取该餐厅的时段
      if (restaurantId) {
        query = query.eq('restaurant_id', restaurantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[CEODashboardService] Error fetching periods:', error);
      return [];
    }
  }

  // 获取所有活跃餐厅
  async getRestaurants(): Promise<{ id: string; name: string }[]> {
    try {
      const { data, error } = await supabase
        .from('roleplay_restaurants')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[CEODashboardService] Error fetching restaurants:', error);
      return [];
    }
  }

  // 获取今日营业周期的开始时间
  private getBusinessCycleStartTime(): Date {
    const now = new Date();
    const startHour = 10; // 从数据库第一个时段获取
    const startDate = new Date(now);
    startDate.setHours(startHour, 0, 0, 0);
    
    // 如果当前时间早于开店时间，说明是昨天的营业周期
    if (now.getHours() < startHour) {
      startDate.setDate(startDate.getDate() - 1);
    }
    
    return startDate;
  }

  // 获取部门类型（前厅/后厨）
  private getDepartmentByRole(roleCode: string): string {
    return roleCode === 'chef' ? '后厨' : '前厅';
  }

  // 获取餐厅的任务数据
  async getRestaurantTaskData(restaurantId: string, periods: CEOPeriod[], department?: '前厅' | '后厨' | null): Promise<CEORestaurantData | null> {
    try {
      const businessStartTime = this.getBusinessCycleStartTime();
      const now = new Date();

      // 1. 获取所有需要完成的任务（manager和chef的任务）
      let roleFilter = ['manager', 'chef', 'duty_manager']; // duty_manager也属于前厅
      if (department === '前厅') {
        roleFilter = ['manager', 'duty_manager'];
      } else if (department === '后厨') {
        roleFilter = ['chef'];
      }

      const { data: tasks, error: tasksError } = await supabase
        .from('roleplay_tasks')
        .select(`
          id,
          title,
          role_code,
          period_id,
          submission_type,
          is_notice,
          is_floating,
          manual_closing
        `)
        .in('role_code', roleFilter)
        .eq('is_active', true)
        .eq('is_notice', false) // 不统计通知类任务
        .or('manual_closing.is.null,manual_closing.eq.false'); // 排除手动闭店任务

      if (tasksError) throw tasksError;

      // 2. 获取今日的任务记录
      const { data: records, error: recordsError } = await supabase
        .from('roleplay_task_records')
        .select(`
          id,
          task_id,
          user_id,
          status,
          submission_type,
          text_content,
          photo_urls,
          submission_metadata,
          created_at,
          created_at_beijing,
          is_late,
          makeup_reason,
          scheduled_start,
          actual_complete,
          roleplay_tasks!roleplay_task_records_task_id_fkey (
            title,
            role_code,
            period_id,
            submission_type
          ),
          roleplay_users!roleplay_task_records_user_id_fkey (
            id,
            full_name,
            roleplay_roles!roleplay_users_role_id_fkey (
              role_name_zh
            )
          )
        `)
        .eq('restaurant_id', restaurantId)
        .gte('created_at', businessStartTime.toISOString())
        .lte('created_at', now.toISOString());

      if (recordsError) throw recordsError;

      // 3. 处理任务数据
      const taskDetails: CEOTaskDetail[] = [];
      const tasksByPeriod: Record<string, CEOTaskDetail[]> = {};
      let isManuallyClosedToday = false;
      let manuallyClosedAt: string | undefined;
      
      // 首先识别特殊任务
      const manualClosingTask = tasks?.find(t => t.manual_closing === true);
      const floatingTasks = tasks?.filter(t => t.is_floating === true) || [];
      
      // 检查手动闭店任务是否已完成
      if (manualClosingTask) {
        const closingRecord = records?.find(r => r.task_id === manualClosingTask.id);
        if (closingRecord) {
          isManuallyClosedToday = true;
          manuallyClosedAt = closingRecord.created_at;
        }
      }
      
      // 构建浮动任务信息
      const floatingTaskInfo: FloatingTaskInfo[] = floatingTasks.map(task => {
        const submissions = records?.filter(r => r.task_id === task.id) || [];
        return {
          task_id: task.id,
          task_title: task.title,
          submission_count: submissions.length,
          submission_type: task.submission_type || 'none'
        };
      });
      
      // 初始化时段分组 - 只包含有任务的时段（排除手动闭店任务）
      const relevantPeriodIds = new Set<string>();
      tasks?.forEach(task => {
        if (task.period_id && !task.manual_closing) {
          relevantPeriodIds.add(task.period_id);
        }
      });
      
      // 只为有相关任务的时段创建分组
      periods.forEach(period => {
        if (relevantPeriodIds.has(period.id)) {
          tasksByPeriod[period.id] = [];
        }
      });

      // 为每个任务创建详情（包括已完成和未完成的）
      const currentTime = now.getTime();
      const taskMap = new Map<string, CEOTaskDetail>();

      // 先添加已完成的任务
      records?.forEach(record => {
        // 根据部门过滤记录
        const taskRoleCode = record.roleplay_tasks.role_code;
        if (department) {
          const shouldInclude = department === '前厅' 
            ? (taskRoleCode === 'manager' || taskRoleCode === 'duty_manager')
            : (taskRoleCode === 'chef');
          if (!shouldInclude) return;
        }
        
        const periodId = record.roleplay_tasks.period_id;
        const period = periods.find(p => p.id === periodId);
        if (!period) return;

        const taskDetail: CEOTaskDetail = {
          id: record.id,
          task_id: record.task_id,
          task_title: record.roleplay_tasks.title,
          user_id: record.user_id,
          user_name: record.roleplay_users.full_name,
          role_name: record.roleplay_users.roleplay_roles?.role_name_zh || '',
          submission_type: record.submission_type || record.roleplay_tasks.submission_type,
          text_content: record.text_content,
          photo_urls: record.photo_urls,
          submission_metadata: record.submission_metadata,
          created_at: record.created_at_beijing || record.created_at,
          is_late: record.is_late || false,
          makeup_reason: record.makeup_reason,  // 添加补救原因
          has_errors: this.checkTaskErrors(record),
          scheduled_time: record.scheduled_start,
          actual_time: record.actual_complete,
          period_id: periodId,
          period_name: period.display_name,
          status: 'completed'
        };

        taskDetails.push(taskDetail);
        // 确保 periodId 对应的数组存在
        if (!tasksByPeriod[periodId]) {
          tasksByPeriod[periodId] = [];
        }
        tasksByPeriod[periodId].push(taskDetail);
        taskMap.set(record.task_id, taskDetail);
      });

      // 添加未完成的任务
      let missingCount = 0;
      tasks?.forEach(task => {
        if (taskMap.has(task.id)) return; // 已经有记录了
        
        // 跳过手动闭店任务，不显示在任务列表中
        if (task.manual_closing) return;
        
        // 处理浮动任务（没有 period_id 的任务）
        if (!task.period_id || task.is_floating) {
          // 浮动任务已经在上面统计了提交次数，这里不再添加到任务列表
          // 因为浮动任务应该显示提交记录而不是待完成状态
          return;
        }
        
        const period = periods.find(p => p.id === task.period_id);
        if (!period) return;

        // 计算任务的计划时间（时段结束时间）
        const [startHours, startMinutes] = period.start_time.split(':');
        const [endHours, endMinutes] = period.end_time.split(':');
        
        const periodStartTime = new Date(businessStartTime);
        periodStartTime.setHours(parseInt(startHours), parseInt(startMinutes), 0);
        
        const periodEndTime = new Date(businessStartTime);
        periodEndTime.setHours(parseInt(endHours), parseInt(endMinutes), 0);
        
        // 如果结束时间小于开始时间，说明跨天了
        if (periodEndTime < periodStartTime) {
          periodEndTime.setDate(periodEndTime.getDate() + 1);
        }

        // 判断任务状态
        // 如果当前时间还在时段内，任务是待完成状态
        // 只有当前时间超过了时段结束时间，任务才是缺失状态
        const isInPeriod = currentTime >= periodStartTime.getTime() && currentTime <= periodEndTime.getTime();
        const isPastDue = currentTime > periodEndTime.getTime();
        const status = isPastDue ? 'missing' : 'pending';
        
        if (status === 'missing') {
          missingCount++;
        }

        const taskDetail: CEOTaskDetail = {
          id: `pending-${task.id}`,
          task_id: task.id,
          task_title: task.title,
          user_id: '',
          user_name: '',
          role_name: '',
          submission_type: task.submission_type || 'none',
          created_at: '',
          is_late: false,
          has_errors: false,
          scheduled_time: periodEndTime.toISOString(),  // 使用时段结束时间作为计划时间
          period_id: task.period_id,
          period_name: period.display_name,
          status: status
        };

        taskDetails.push(taskDetail);
        // 确保 period_id 对应的数组存在
        if (!tasksByPeriod[task.period_id]) {
          tasksByPeriod[task.period_id] = [];
        }
        tasksByPeriod[task.period_id].push(taskDetail);
      });

      // 4. 计算员工统计
      const employeeMap = new Map<string, CEOEmployeeStat>();
      
      records?.forEach(record => {
        const userId = record.user_id;
        const taskRoleCode = record.roleplay_tasks.role_code;
        
        // 根据部门筛选员工统计
        if (department) {
          const taskDepartment = this.getDepartmentByRole(taskRoleCode);
          if (taskDepartment !== department) return;
        }
        
        if (!employeeMap.has(userId)) {
          employeeMap.set(userId, {
            user_id: userId,
            user_name: record.roleplay_users.full_name,
            role_name: record.roleplay_users.roleplay_roles?.role_name_zh || '',
            completed_tasks: 0,
            total_tasks: 0,
            on_time_rate: 100,
            late_count: 0
          });
        }

        const stat = employeeMap.get(userId)!;
        stat.total_tasks++;
        
        // 任务状态可能是 'submitted' 或 'completed'，都算作已完成
        if (record.status === 'completed' || record.status === 'submitted') {
          stat.completed_tasks++;
          if (record.is_late) {
            stat.late_count++;
          }
        }
      });

      // 计算准时率
      employeeMap.forEach(stat => {
        // 如果有总任务，则基于总任务计算准时率
        // 准时完成的任务数 / 总任务数
        if (stat.total_tasks > 0) {
          const onTimeCompletedTasks = stat.completed_tasks - stat.late_count;
          stat.on_time_rate = (onTimeCompletedTasks / stat.total_tasks) * 100;
        } else {
          stat.on_time_rate = 0; // 没有任务时准时率为0
        }
      });

      const employeeStats = Array.from(employeeMap.values())
        .sort((a, b) => b.completed_tasks - a.completed_tasks);

      // 5. 计算总体统计
      const completedTasks = taskDetails.filter(t => t.status === 'completed').length;
      const lateTasks = taskDetails.filter(t => t.is_late).length;
      const errorTasks = taskDetails.filter(t => t.has_errors).length;
      const onTimeRate = completedTasks > 0 ? 
        ((completedTasks - lateTasks) / completedTasks) * 100 : 100;

      // 6. 获取餐厅名称
      const { data: restaurant } = await supabase
        .from('roleplay_restaurants')
        .select('name')
        .eq('id', restaurantId)
        .single();

      const currentPeriod = this.getCurrentPeriod(periods);

      return {
        restaurant_id: restaurantId,
        restaurant_name: restaurant?.name || '未知餐厅',
        total_tasks: tasks?.length || 0,
        completed_tasks: completedTasks,
        on_time_rate: onTimeRate,
        current_period: currentPeriod?.display_name || '',
        current_period_id: currentPeriod?.id || '',
        task_details: taskDetails,
        tasks_by_period: tasksByPeriod,
        employee_stats: employeeStats,
        missing_tasks_count: missingCount,
        late_tasks_count: lateTasks,
        error_tasks_count: errorTasks,
        is_manually_closed: isManuallyClosedToday,
        manually_closed_at: manuallyClosedAt,
        floating_task_info: floatingTaskInfo
      };
    } catch (error) {
      console.error('[CEODashboardService] Error fetching restaurant data:', error);
      return null;
    }
  }

  // 检查任务是否有错误
  private checkTaskErrors(record: any): boolean {
    if (record.submission_type === 'list' && record.submission_metadata?.checklist) {
      return record.submission_metadata.checklist.some((item: any) => 
        item.status === 'fail' || item.status === 'error'
      );
    }
    return false;
  }

  // 生成警告信息
  generateAlerts(restaurants: CEORestaurantData[], department: '前厅' | '后厨'): CEOAlert[] {
    const alerts: CEOAlert[] = [];
    
    restaurants.forEach(restaurant => {
      // 缺失任务警告（红色）
      if (restaurant.missing_tasks_count > 0) {
        alerts.push({
          id: `${restaurant.restaurant_id}-${department}-missing`,
          type: 'error',
          restaurant_id: restaurant.restaurant_id,
          restaurant_name: restaurant.restaurant_name,
          department: department,
          message: `${restaurant.missing_tasks_count}个任务未完成`,
          count: restaurant.missing_tasks_count,
          timestamp: new Date().toISOString()
        });
      }

      // 延迟任务警告（黄色）
      if (restaurant.late_tasks_count > 0) {
        alerts.push({
          id: `${restaurant.restaurant_id}-${department}-late`,
          type: 'warning',
          restaurant_id: restaurant.restaurant_id,
          restaurant_name: restaurant.restaurant_name,
          department: department,
          message: `${restaurant.late_tasks_count}个任务延迟完成`,
          count: restaurant.late_tasks_count,
          timestamp: new Date().toISOString()
        });
      }

      // 错误任务警告（黄色）
      if (restaurant.error_tasks_count > 0) {
        alerts.push({
          id: `${restaurant.restaurant_id}-${department}-error`,
          type: 'warning',
          restaurant_id: restaurant.restaurant_id,
          restaurant_name: restaurant.restaurant_name,
          department: department,
          message: `${restaurant.error_tasks_count}个任务存在质量问题`,
          count: restaurant.error_tasks_count,
          timestamp: new Date().toISOString()
        });
      }
      
      // 为每个List任务的失败项生成具体警告
      restaurant.task_details.forEach(task => {
        if (task.status === 'completed' && task.submission_type === 'list' && task.submission_metadata?.checklist) {
          const failedItems = task.submission_metadata.checklist.filter((item: any) => 
            item.status === 'fail' || item.status === 'error'
          );
          
          if (failedItems.length > 0) {
            alerts.push({
              id: `${restaurant.restaurant_id}-${department}-list-${task.id}`,
              type: 'error',
              restaurant_id: restaurant.restaurant_id,
              restaurant_name: restaurant.restaurant_name,
              department: department,
              message: `${task.task_title} - ${failedItems.length}项检查未通过`,
              count: failedItems.length,
              timestamp: new Date().toISOString()
            });
          }
        }
      });
    });

    // 按优先级排序：错误 > 警告
    return alerts.sort((a, b) => {
      if (a.type === 'error' && b.type !== 'error') return -1;
      if (a.type !== 'error' && b.type === 'error') return 1;
      return b.count - a.count;
    });
  }

  // 合并餐厅的前厅和后厨数据
  private combineRestaurantData(frontOffice: CEORestaurantData | null, kitchen: CEORestaurantData | null): CombinedRestaurantData | null {
    if (!frontOffice && !kitchen) return null;
    
    const restaurantId = frontOffice?.restaurant_id || kitchen?.restaurant_id || '';
    const restaurantName = frontOffice?.restaurant_name || kitchen?.restaurant_name || '';
    
    return {
      restaurant_id: restaurantId,
      restaurant_name: restaurantName,
      total_missing_tasks: (frontOffice?.missing_tasks_count || 0) + (kitchen?.missing_tasks_count || 0),
      total_late_tasks: (frontOffice?.late_tasks_count || 0) + (kitchen?.late_tasks_count || 0),
      total_error_tasks: (frontOffice?.error_tasks_count || 0) + (kitchen?.error_tasks_count || 0),
      front_office_stats: frontOffice ? {
        missing_tasks_count: frontOffice.missing_tasks_count,
        late_tasks_count: frontOffice.late_tasks_count,
        error_tasks_count: frontOffice.error_tasks_count
      } : undefined,
      kitchen_stats: kitchen ? {
        missing_tasks_count: kitchen.missing_tasks_count,
        late_tasks_count: kitchen.late_tasks_count,
        error_tasks_count: kitchen.error_tasks_count
      } : undefined
    };
  }

  // 优化后的处理餐厅数据方法
  private processRestaurantDataOptimized(
    restaurant: { id: string; name: string },
    periods: CEOPeriod[],
    allTasks: any[],
    restaurantRecords: any[],
    department: '前厅' | '后厨'
  ): CEORestaurantData | null {
    try {
      const now = new Date();
      const currentTime = now.getTime();
      const businessStartTime = this.getBusinessCycleStartTime();
      
      // 过滤部门相关的任务
      const roleFilter = department === '前厅' 
        ? ['manager', 'duty_manager']
        : ['chef'];
      
      const relevantTasks = allTasks.filter(task => 
        roleFilter.includes(task.role_code)
      );
      
      // 过滤部门相关的记录
      const relevantRecords = restaurantRecords.filter(record => {
        const taskRoleCode = record.roleplay_tasks?.role_code;
        return roleFilter.includes(taskRoleCode);
      });
      
      // 处理任务数据
      const taskDetails: CEOTaskDetail[] = [];
      const tasksByPeriod: Record<string, CEOTaskDetail[]> = {};
      const taskMap = new Map<string, CEOTaskDetail>();
      
      // 特殊任务识别
      const manualClosingTask = relevantTasks.find(t => t.manual_closing === true);
      const floatingTasks = relevantTasks.filter(t => t.is_floating === true);
      
      let isManuallyClosedToday = false;
      let manuallyClosedAt: string | undefined;
      
      if (manualClosingTask) {
        const closingRecord = relevantRecords.find(r => r.task_id === manualClosingTask.id);
        if (closingRecord) {
          isManuallyClosedToday = true;
          manuallyClosedAt = closingRecord.created_at;
        }
      }
      
      // 构建浮动任务信息
      const floatingTaskInfo: FloatingTaskInfo[] = floatingTasks.map(task => {
        const submissions = relevantRecords.filter(r => r.task_id === task.id);
        return {
          task_id: task.id,
          task_title: task.title,
          submission_count: submissions.length,
          submission_type: task.submission_type || 'none'
        };
      });
      
      // 初始化时段分组
      const relevantPeriodIds = new Set<string>();
      relevantTasks.forEach(task => {
        if (task.period_id && !task.manual_closing) {
          relevantPeriodIds.add(task.period_id);
        }
      });
      
      periods.forEach(period => {
        if (relevantPeriodIds.has(period.id)) {
          tasksByPeriod[period.id] = [];
        }
      });
      
      // 处理已完成的任务记录
      relevantRecords.forEach(record => {
        const periodId = record.roleplay_tasks?.period_id;
        const period = periods.find(p => p.id === periodId);
        if (!period) return;
        
        const taskDetail: CEOTaskDetail = {
          id: record.id,
          task_id: record.task_id,
          task_title: record.roleplay_tasks?.title || '',
          user_id: record.user_id,
          user_name: record.roleplay_users?.full_name || '',
          role_name: record.roleplay_users?.roleplay_roles?.role_name_zh || '',
          submission_type: record.submission_type || record.roleplay_tasks?.submission_type,
          text_content: record.text_content,
          photo_urls: record.photo_urls,
          submission_metadata: record.submission_metadata,
          created_at: record.created_at_beijing || record.created_at,
          is_late: record.is_late || false,
          makeup_reason: record.makeup_reason,
          has_errors: this.checkTaskErrors(record),
          scheduled_time: record.scheduled_start,
          actual_time: record.actual_complete,
          period_id: periodId,
          period_name: period.display_name,
          status: 'completed'
        };
        
        taskDetails.push(taskDetail);
        if (tasksByPeriod[periodId]) {
          tasksByPeriod[periodId].push(taskDetail);
        }
        taskMap.set(record.task_id, taskDetail);
      });
      
      // 处理未完成的任务
      let missingCount = 0;
      relevantTasks.forEach(task => {
        if (taskMap.has(task.id) || task.manual_closing || task.is_floating) return;
        
        const period = periods.find(p => p.id === task.period_id);
        if (!period) return;
        
        const [endHours, endMinutes] = period.end_time.split(':');
        const periodEndTime = new Date(businessStartTime);
        periodEndTime.setHours(parseInt(endHours), parseInt(endMinutes), 0);
        
        if (periodEndTime < businessStartTime) {
          periodEndTime.setDate(periodEndTime.getDate() + 1);
        }
        
        const isPastDue = currentTime > periodEndTime.getTime();
        const status = isPastDue ? 'missing' : 'pending';
        
        if (status === 'missing') {
          missingCount++;
        }
        
        const taskDetail: CEOTaskDetail = {
          id: `pending-${task.id}`,
          task_id: task.id,
          task_title: task.title,
          user_id: '',
          user_name: '',
          role_name: '',
          submission_type: task.submission_type || 'none',
          created_at: '',
          is_late: false,
          has_errors: false,
          scheduled_time: periodEndTime.toISOString(),
          period_id: task.period_id,
          period_name: period.display_name,
          status: status
        };
        
        taskDetails.push(taskDetail);
        if (tasksByPeriod[task.period_id]) {
          tasksByPeriod[task.period_id].push(taskDetail);
        }
      });
      
      // 计算员工统计
      const employeeMap = new Map<string, CEOEmployeeStat>();
      relevantRecords.forEach(record => {
        const userId = record.user_id;
        if (!employeeMap.has(userId)) {
          employeeMap.set(userId, {
            user_id: userId,
            user_name: record.roleplay_users?.full_name || '',
            role_name: record.roleplay_users?.roleplay_roles?.role_name_zh || '',
            completed_tasks: 0,
            total_tasks: 0,
            on_time_rate: 100,
            late_count: 0
          });
        }
        
        const stat = employeeMap.get(userId)!;
        stat.total_tasks++;
        if (record.status === 'completed' || record.status === 'submitted') {
          stat.completed_tasks++;
          if (record.is_late) {
            stat.late_count++;
          }
        }
      });
      
      employeeMap.forEach(stat => {
        if (stat.total_tasks > 0) {
          const onTimeCompletedTasks = stat.completed_tasks - stat.late_count;
          stat.on_time_rate = (onTimeCompletedTasks / stat.total_tasks) * 100;
        }
      });
      
      const employeeStats = Array.from(employeeMap.values())
        .sort((a, b) => b.completed_tasks - a.completed_tasks);
      
      // 计算总体统计
      const completedTasks = taskDetails.filter(t => t.status === 'completed').length;
      const lateTasks = taskDetails.filter(t => t.is_late).length;
      const errorTasks = taskDetails.filter(t => t.has_errors).length;
      const onTimeRate = completedTasks > 0 ? 
        ((completedTasks - lateTasks) / completedTasks) * 100 : 100;
      
      const currentPeriod = this.getCurrentPeriod(periods);
      
      return {
        restaurant_id: restaurant.id,
        restaurant_name: restaurant.name,
        total_tasks: relevantTasks.filter(t => !t.is_floating && !t.manual_closing).length,
        completed_tasks: completedTasks,
        on_time_rate: onTimeRate,
        current_period: currentPeriod?.display_name || '',
        current_period_id: currentPeriod?.id || '',
        task_details: taskDetails,
        tasks_by_period: tasksByPeriod,
        employee_stats: employeeStats,
        missing_tasks_count: missingCount,
        late_tasks_count: lateTasks,
        error_tasks_count: errorTasks,
        is_manually_closed: isManuallyClosedToday,
        manually_closed_at: manuallyClosedAt,
        floating_task_info: floatingTaskInfo
      };
    } catch (error) {
      console.error('[CEODashboardService] Error processing restaurant data:', error);
      return null;
    }
  }

  // 计算时段的警告和错误数量
  private calculatePeriodStatistics(periods: CEOPeriod[], tasksByPeriod: Record<string, CEOTaskDetail[]>): CEOPeriod[] {
    return periods.map(period => {
      const periodTasks = tasksByPeriod[period.id] || [];
      const warningCount = periodTasks.filter(t => t.is_late).length;
      const errorCount = periodTasks.filter(t => t.status === 'missing' || t.has_errors).length;
      
      return {
        ...period,
        warning_count: warningCount,
        error_count: errorCount
      };
    });
  }

  // 获取所有餐厅的数据（优化版本 - 批量查询）
  async getAllRestaurantsData(): Promise<{
    frontOfficeData: {
      restaurants: CEORestaurantData[];
      alerts: CEOAlert[];
    };
    kitchenData: {
      restaurants: CEORestaurantData[];
      alerts: CEOAlert[];
    };
    combinedData: CombinedRestaurantData[];
    allAlerts: CEOAlert[];
    periods: CEOPeriod[];
  }> {
    try {
      console.time('[CEODashboardService] Total load time');
      
      // 1. 批量获取基础数据
      console.time('[CEODashboardService] Fetching base data');
      const [restaurantList, allPeriods, allTasks, allRecords] = await Promise.all([
        // 获取所有餐厅
        this.getRestaurants(),
        
        // 获取所有时段（假设结构相同）
        supabase
          .from('roleplay_workflow_periods')
          .select('*')
          .order('display_order'),
        
        // 获取所有任务定义
        supabase
          .from('roleplay_tasks')
          .select('*')
          .in('role_code', ['manager', 'chef', 'duty_manager'])
          .eq('is_active', true)
          .eq('is_notice', false)
          .or('manual_closing.is.null,manual_closing.eq.false'),
        
        // 获取今日所有记录（一次性获取所有餐厅的）
        (() => {
          const businessStartTime = this.getBusinessCycleStartTime();
          const now = new Date();
          return supabase
            .from('roleplay_task_records')
            .select(`
              id,
              task_id,
              user_id,
              restaurant_id,
              status,
              submission_type,
              text_content,
              photo_urls,
              submission_metadata,
              created_at,
              created_at_beijing,
              is_late,
              makeup_reason,
              scheduled_start,
              actual_complete,
              roleplay_tasks!roleplay_task_records_task_id_fkey (
                title,
                role_code,
                period_id,
                submission_type
              ),
              roleplay_users!roleplay_task_records_user_id_fkey (
                id,
                full_name,
                roleplay_roles!roleplay_users_role_id_fkey (
                  role_name_zh
                )
              )
            `)
            .gte('created_at', businessStartTime.toISOString())
            .lte('created_at', now.toISOString());
        })()
      ]);
      console.timeEnd('[CEODashboardService] Fetching base data');
      
      // 2. 处理错误和空数据
      if (restaurantList.length === 0) {
        console.timeEnd('[CEODashboardService] Total load time');
        return {
          frontOfficeData: { restaurants: [], alerts: [] },
          kitchenData: { restaurants: [], alerts: [] },
          combinedData: [],
          allAlerts: [],
          periods: []
        };
      }
      
      const periods = allPeriods.data || [];
      const tasks = allTasks.data || [];
      const records = allRecords.data || [];
      
      // 3. 创建索引映射以提高查询速度
      console.time('[CEODashboardService] Building indexes');
      const recordsByRestaurant = new Map<string, any[]>();
      records.forEach(record => {
        if (!recordsByRestaurant.has(record.restaurant_id)) {
          recordsByRestaurant.set(record.restaurant_id, []);
        }
        recordsByRestaurant.get(record.restaurant_id)!.push(record);
      });
      console.timeEnd('[CEODashboardService] Building indexes');
      
      // 4. 批量处理每个餐厅的数据
      console.time('[CEODashboardService] Processing restaurant data');
      const processRestaurantData = (
        restaurant: { id: string; name: string },
        department: '前厅' | '后厨'
      ): CEORestaurantData | null => {
        const restaurantRecords = recordsByRestaurant.get(restaurant.id) || [];
        return this.processRestaurantDataOptimized(
          restaurant,
          periods,
          tasks,
          restaurantRecords,
          department
        );
      };
      
      // 并行处理所有餐厅的前厅和后厨数据
      const results = restaurantList.map(restaurant => ({
        frontOfficeData: processRestaurantData(restaurant, '前厅'),
        kitchenData: processRestaurantData(restaurant, '后厨')
      }));
      console.timeEnd('[CEODashboardService] Processing restaurant data');
      
      const frontOfficeData = results.map(r => r.frontOfficeData).filter(data => data !== null) as CEORestaurantData[];
      const kitchenData = results.map(r => r.kitchenData).filter(data => data !== null) as CEORestaurantData[];
      
      // 5. 合并餐厅数据
      const combinedData: CombinedRestaurantData[] = [];
      restaurantList.forEach((restaurant, index) => {
        const combined = this.combineRestaurantData(
          results[index].frontOfficeData,
          results[index].kitchenData
        );
        if (combined) {
          combinedData.push(combined);
        }
      });
      
      // 6. 计算时段统计
      let periodsWithStats = periods;
      if (frontOfficeData.length > 0 || kitchenData.length > 0) {
        const currentRestaurantData = frontOfficeData[0] || kitchenData[0];
        if (currentRestaurantData) {
          periodsWithStats = this.calculatePeriodStatistics(periods, currentRestaurantData.tasks_by_period);
        }
      }
      
      // 7. 生成警告
      const frontOfficeAlerts = this.generateAlerts(frontOfficeData, '前厅');
      const kitchenAlerts = this.generateAlerts(kitchenData, '后厨');
      const allAlerts = [...frontOfficeAlerts, ...kitchenAlerts].sort((a, b) => {
        if (a.type === 'error' && b.type !== 'error') return -1;
        if (a.type !== 'error' && b.type === 'error') return 1;
        return b.count - a.count;
      });
      
      console.timeEnd('[CEODashboardService] Total load time');
      
      return {
        frontOfficeData: {
          restaurants: frontOfficeData,
          alerts: frontOfficeAlerts
        },
        kitchenData: {
          restaurants: kitchenData,
          alerts: kitchenAlerts
        },
        combinedData,
        allAlerts,
        periods: periodsWithStats
      };
    } catch (error) {
      console.error('[CEODashboardService] Error fetching all restaurants data:', error);
      console.timeEnd('[CEODashboardService] Total load time');
      return {
        frontOfficeData: {
          restaurants: [],
          alerts: []
        },
        kitchenData: {
          restaurants: [],
          alerts: []
        },
        combinedData: [],
        allAlerts: [],
        periods: []
      };
    }
  }

  // 获取浮动任务的所有提交记录
  async getFloatingTaskSubmissions(taskId: string, restaurantId: string, department?: '前厅' | '后厨'): Promise<CEOTaskDetail[]> {
    try {
      const businessStartTime = this.getBusinessCycleStartTime();
      const businessEndTime = new Date(businessStartTime);
      businessEndTime.setDate(businessEndTime.getDate() + 1);
      businessEndTime.setHours(10, 0, 0, 0);

      // 获取该浮动任务的所有提交记录
      const query = supabase
        .from('roleplay_task_records')
        .select(`
          *,
          roleplay_tasks!inner(
            id,
            title,
            role_code,
            submission_type,
            is_floating
          ),
          roleplay_users!user_id(
            id,
            full_name,
            roleplay_roles(
              role_name_zh
            )
          )
        `)
        .eq('task_id', taskId)
        .eq('restaurant_id', restaurantId)
        .gte('created_at', businessStartTime.toISOString())
        .lt('created_at', businessEndTime.toISOString())
        .order('created_at', { ascending: false });

      const { data: records, error } = await query;

      if (error) {
        console.error('[CEODashboardService] Error fetching floating task submissions:', error);
        return [];
      }

      const submissions: CEOTaskDetail[] = [];
      
      records?.forEach(record => {
        // 根据部门过滤
        if (department) {
          const taskRoleCode = record.roleplay_tasks.role_code;
          const taskDepartment = this.getDepartmentByRole(taskRoleCode);
          if (taskDepartment !== department) return;
        }

        const submission: CEOTaskDetail = {
          id: record.id,
          task_id: record.task_id,
          task_title: record.roleplay_tasks.title,
          user_id: record.user_id,
          user_name: record.roleplay_users.full_name,
          role_name: record.roleplay_users.roleplay_roles?.role_name_zh || '',
          submission_type: record.submission_type || record.roleplay_tasks.submission_type,
          text_content: record.text_content,
          photo_urls: record.photo_urls,
          submission_metadata: record.submission_metadata,
          created_at: record.created_at_beijing || record.created_at,
          is_late: record.is_late || false,
          makeup_reason: record.makeup_reason,
          has_errors: this.checkTaskErrors(record),
          scheduled_time: record.scheduled_start,
          actual_time: record.actual_complete,
          period_id: '',
          period_name: '浮动任务',
          status: 'completed'
        };

        submissions.push(submission);
      });

      return submissions;
    } catch (error) {
      console.error('[CEODashboardService] Error fetching floating task submissions:', error);
      return [];
    }
  }

  // 订阅实时更新
  subscribeToUpdates(callback: (data: any) => void) {
    const channel = supabase
      .channel('ceo-dashboard-updates')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'roleplay_task_records' 
        }, 
        callback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const ceoDashboardService = new CEODashboardService();

// Re-export types for easier imports
export type {
  CEOTaskDetail,
  CEOEmployeeStat,
  CEORestaurantData,
  CEOPeriod,
  CEOAlert,
  CombinedRestaurantData,
  FloatingTaskInfo
};