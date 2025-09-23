/**
 * Progressive Task Loading Context
 * 渐进式任务加载上下文 - 根据营业状态智能加载组件
 * Version: 1.1.0
 * Created: 2025-01-13
 * Updated: 2025-01-24 - Use unified PageLoader component
 *
 * 功能：
 * 1. 首先判断是否在营业时间内
 * 2. 如果不在营业时间，显示等待界面
 * 3. 如果在营业时间，分阶段加载：
 *    - 立即：时间组件
 *    - 200ms：当前任务
 *    - 500ms：任务统计
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { authService } from '../services/authService'
import { restaurantConfigService } from '../services/restaurantConfigService'
import { getCurrentTestTime } from '../utils/globalTestTime'
import type { WorkflowPeriod, TaskTemplate } from '../types/task.types'
import {
  Box,
  CircularProgress,
  Typography,
  Skeleton,
  Stack,
  LinearProgress
} from '@mui/material'
import { PageLoader } from '../components/PageLoader/PageLoader'

// 加载阶段枚举
export enum LoadingPhase {
  CHECKING_HOURS = 'checking_hours',    // 检查营业时间
  NOT_IN_BUSINESS = 'not_in_business',  // 不在营业时间
  LOADING_CURRENT = 'loading_current',  // 加载当前期间
  LOADING_STATS = 'loading_stats',      // 加载统计数据
  COMPLETE = 'complete'                  // 加载完成
}

interface ProgressiveTaskContextType {
  // 营业状态
  isInBusinessHours: boolean
  currentPeriod: WorkflowPeriod | null
  nextPeriod: WorkflowPeriod | null

  // 加载状态
  loadingPhase: LoadingPhase
  loadingProgress: number // 0-100

  // 当前期间数据（快速加载）
  currentPeriodTasks: TaskTemplate[]
  currentPeriodLoading: boolean

  // 浮动任务
  floatingTasks: TaskTemplate[]

  // 统计数据（延迟加载）
  statsData: {
    completionRate: number
    completedCount: number
    totalCount: number
    missingTasks: any[]
  } | null
  statsLoading: boolean

  // 所有期间数据（后台加载）
  allPeriods: WorkflowPeriod[]
  allPeriodsLoading: boolean

  // 刷新方法
  refresh: () => Promise<void>
}

const ProgressiveTaskContext = createContext<ProgressiveTaskContextType | undefined>(undefined)

export const useProgressiveTask = () => {
  const context = useContext(ProgressiveTaskContext)
  if (!context) {
    throw new Error('useProgressiveTask must be used within ProgressiveTaskProvider')
  }
  return context
}

interface ProgressiveTaskProviderProps {
  children: React.ReactNode
}

export const ProgressiveTaskProvider: React.FC<ProgressiveTaskProviderProps> = ({ children }) => {
  // 营业状态
  const [isInBusinessHours, setIsInBusinessHours] = useState(false)
  const [currentPeriod, setCurrentPeriod] = useState<WorkflowPeriod | null>(null)
  const [nextPeriod, setNextPeriod] = useState<WorkflowPeriod | null>(null)

  // 加载状态
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>(LoadingPhase.CHECKING_HOURS)
  const [loadingProgress, setLoadingProgress] = useState(0)

  // 数据状态
  const [currentPeriodTasks, setCurrentPeriodTasks] = useState<TaskTemplate[]>([])
  const [currentPeriodLoading, setCurrentPeriodLoading] = useState(true)
  const [floatingTasks, setFloatingTasks] = useState<TaskTemplate[]>([])
  const [statsData, setStatsData] = useState<any>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [allPeriods, setAllPeriods] = useState<WorkflowPeriod[]>([])
  const [allPeriodsLoading, setAllPeriodsLoading] = useState(true)

  // 检查营业时间并获取当前期间
  const checkBusinessHours = useCallback(async () => {
    try {
      console.log('[ProgressiveTaskContext] 🚀 Starting checkBusinessHours...')
      setLoadingPhase(LoadingPhase.CHECKING_HOURS)
      setLoadingProgress(10)

      const restaurantId = await restaurantConfigService.getRestaurantId()
      console.log('[ProgressiveTaskContext] Restaurant ID:', restaurantId)
      if (!restaurantId) {
        console.log('[ProgressiveTaskContext] ❌ No restaurant ID, not in business')
        setIsInBusinessHours(false)
        setLoadingPhase(LoadingPhase.NOT_IN_BUSINESS)
        return false
      }

      // 获取所有期间来判断营业时间
      const { data: periods, error } = await supabase
        .from('roleplay_workflow_periods')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('display_order')

      if (error || !periods || periods.length === 0) {
        console.log('[ProgressiveTaskContext] ❌ No periods found, error:', error)
        setIsInBusinessHours(false)
        setLoadingPhase(LoadingPhase.NOT_IN_BUSINESS)
        return false
      }

      console.log('[ProgressiveTaskContext] 📋 Found periods:', periods.length)

      // 获取所有任务并按期间组织
      const { data: allTasks } = await supabase
        .from('roleplay_tasks')
        .select('*')
        .or(`restaurant_id.eq.${restaurantId},restaurant_id.is.null`)
        .order('sort_order')

      if (allTasks) {
        // 按期间组织任务
        const periodTaskMap = new Map()
        for (const task of allTasks) {
          if (task.period_id) {
            if (!periodTaskMap.has(task.period_id)) {
              periodTaskMap.set(task.period_id, [])
            }
            periodTaskMap.get(task.period_id).push(task)
          }
        }

        // 将任务分配到各个期间
        for (const period of periods) {
          const tasks = periodTaskMap.get(period.id) || []
          // 按角色组织任务
          period.tasks = {
            manager: tasks.filter(t => t.role_code === 'manager'),
            chef: tasks.filter(t => t.role_code === 'chef'),
            duty_manager: tasks.filter(t => t.role_code === 'duty_manager')
          }
        }

        console.log('[ProgressiveTaskContext] 📦 Organized tasks into periods')
      }

      // 判断当前时间是否在任何期间内
      const now = getCurrentTestTime() || new Date()
      const currentTimeStr = now.toTimeString().slice(0, 5)
      const currentHour = now.getHours()
      const currentMinutes = now.getMinutes()
      const currentTotalMinutes = currentHour * 60 + currentMinutes

      console.log('[ProgressiveTaskContext] ⏰ Current time:', currentTimeStr, 'Total minutes:', currentTotalMinutes)

      let foundCurrentPeriod = false
      let current = null
      let next = null

      for (let i = 0; i < periods.length; i++) {
        const period = periods[i]
        const [startHour, startMin] = period.start_time.split(':').map(Number)
        const [endHour, endMin] = period.end_time.split(':').map(Number)

        const startTotalMinutes = startHour * 60 + startMin
        let endTotalMinutes = endHour * 60 + endMin

        // 处理跨日的情况
        if (endTotalMinutes < startTotalMinutes) {
          if (currentTotalMinutes >= startTotalMinutes || currentTotalMinutes < endTotalMinutes) {
            current = period
            foundCurrentPeriod = true
            next = periods[(i + 1) % periods.length]
            break
          }
        } else {
          if (currentTotalMinutes >= startTotalMinutes && currentTotalMinutes < endTotalMinutes) {
            current = period
            foundCurrentPeriod = true
            next = periods[(i + 1) % periods.length]
            break
          }
        }
      }

      // 如果不在任何期间内，找下一个期间
      if (!foundCurrentPeriod) {
        // 找到下一个开始的期间
        for (const period of periods) {
          const [startHour, startMin] = period.start_time.split(':').map(Number)
          const startTotalMinutes = startHour * 60 + startMin

          if (startTotalMinutes > currentTotalMinutes) {
            next = period
            break
          }
        }

        // 如果没找到（说明今天的都过了），下一个是明天的第一个
        if (!next) {
          next = periods[0]
        }
      }

      console.log('[ProgressiveTaskContext] 📌 Current period:', current?.id, 'Next period:', next?.id)
      console.log('[ProgressiveTaskContext] 🏪 In business hours:', foundCurrentPeriod)

      setCurrentPeriod(current)
      setNextPeriod(next)
      setIsInBusinessHours(foundCurrentPeriod)
      setAllPeriods(periods)

      if (!foundCurrentPeriod) {
        console.log('[ProgressiveTaskContext] 🌙 Not in business hours, showing waiting screen')
        setLoadingPhase(LoadingPhase.NOT_IN_BUSINESS)
        setLoadingProgress(100)
        return false
      }

      console.log('[ProgressiveTaskContext] ✅ In business hours! Will continue loading...')
      return true
    } catch (error) {
      console.error('[ProgressiveTaskContext] Error checking business hours:', error)
      setIsInBusinessHours(false)
      setLoadingPhase(LoadingPhase.NOT_IN_BUSINESS)
      return false
    }
  }, [])

  // 加载当前期间的任务
  const loadCurrentPeriodTasks = useCallback(async () => {
    if (!currentPeriod) {
      console.log('[ProgressiveTaskContext] 🔄 No current period, skipping task loading')
      return
    }

    try {
      console.log('[ProgressiveTaskContext] 📦 Loading tasks for period:', currentPeriod.id)
      console.log('[ProgressiveTaskContext] ⏱️ Phase transition: LOADING_CURRENT at', new Date().toISOString())
      setLoadingPhase(LoadingPhase.LOADING_CURRENT)
      setLoadingProgress(30)
      setCurrentPeriodLoading(true)

      const restaurantId = await restaurantConfigService.getRestaurantId()
      if (!restaurantId) return

      // 获取所有任务（包括当前期间的、浮动任务和notices）
      const { data: allTasks, error } = await supabase
        .from('roleplay_tasks')
        .select('*')
        .or(`restaurant_id.eq.${restaurantId},restaurant_id.is.null`)
        .order('sort_order')

      if (!error && allTasks) {
        // 分离当前期间任务和浮动任务
        const periodTasks = allTasks.filter(task =>
          task.period_id === currentPeriod.id
        )
        const floatingTasksData = allTasks.filter(task =>
          task.is_floating === true && task.role_code === 'manager'
        )

        console.log('[ProgressiveTaskContext] ✅ Loaded', periodTasks.length, 'tasks for current period')
        console.log('[ProgressiveTaskContext] ✅ Loaded', floatingTasksData.length, 'floating tasks')

        setCurrentPeriodTasks(periodTasks as TaskTemplate[])
        setFloatingTasks(floatingTasksData as TaskTemplate[])
      } else if (error) {
        console.error('[ProgressiveTaskContext] ❌ Error loading tasks:', error)
      }

      setLoadingProgress(60)
      setCurrentPeriodLoading(false)
      console.log('[ProgressiveTaskContext] 📊 Current period loading complete at', new Date().toISOString())
    } catch (error) {
      console.error('[ProgressiveTaskContext] Error loading current period tasks:', error)
      setCurrentPeriodLoading(false)
    }
  }, [currentPeriod])

  // 延迟加载统计数据
  const loadStatsData = useCallback(async () => {
    try {
      console.log('[ProgressiveTaskContext] 📈 Starting stats loading at', new Date().toISOString())
      console.log('[ProgressiveTaskContext] ⏱️ Phase transition: LOADING_STATS')
      setLoadingPhase(LoadingPhase.LOADING_STATS)
      setLoadingProgress(70)
      setStatsLoading(true)

      // 延迟500ms开始加载，给用户更好的渐进感
      console.log('[ProgressiveTaskContext] ⏳ Delaying stats load by 500ms...')
      await new Promise(resolve => setTimeout(resolve, 500))
      console.log('[ProgressiveTaskContext] ⏰ 500ms delay complete, fetching stats...')

      const currentUser = authService.getCurrentUser()
      if (!currentUser) return

      const restaurantId = await restaurantConfigService.getRestaurantId()
      if (!restaurantId) return

      // 获取今日任务完成情况
      const today = new Date().toISOString().split('T')[0]
      const { data: records, error } = await supabase
        .from('roleplay_task_records')
        .select('task_id')
        .eq('user_id', currentUser.id)
        .eq('date', today)
        .eq('status', 'completed')

      if (!error && records) {
        const completedIds = records.map(r => r.task_id)

        // 计算统计数据
        const allTasks = allPeriods.flatMap(p => p.tasks?.manager || [])
        const regularTasks = allTasks.filter(t => !t.isNotice && !t.isFloating)
        const completedCount = regularTasks.filter(t => completedIds.includes(t.id)).length
        const totalCount = regularTasks.length
        const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

        // 找出缺失的任务
        const missingTasks = regularTasks
          .filter(t => !completedIds.includes(t.id))
          .map(t => ({
            id: t.id,
            title: t.title,
            period: allPeriods.find(p => p.tasks?.manager?.some(pt => pt.id === t.id))?.displayName
          }))

        setStatsData({
          completionRate,
          completedCount,
          totalCount,
          missingTasks
        })
      }

      setLoadingProgress(90)
      setStatsLoading(false)
      console.log('[ProgressiveTaskContext] 📊 Stats loading complete at', new Date().toISOString())

      // 后台继续加载所有期间数据
      setAllPeriodsLoading(false)
      console.log('[ProgressiveTaskContext] ⏱️ Phase transition: COMPLETE')
      setLoadingPhase(LoadingPhase.COMPLETE)
      setLoadingProgress(100)
      console.log('[ProgressiveTaskContext] 🎉 All loading complete at', new Date().toISOString())
    } catch (error) {
      console.error('[ProgressiveTaskContext] Error loading stats:', error)
      setStatsLoading(false)
    }
  }, [allPeriods])

  // 刷新方法
  const refresh = useCallback(async () => {
    setLoadingPhase(LoadingPhase.CHECKING_HOURS)
    setLoadingProgress(0)

    const inBusiness = await checkBusinessHours()
    if (inBusiness) {
      await loadCurrentPeriodTasks()
      await loadStatsData()
    }
  }, [checkBusinessHours, loadCurrentPeriodTasks, loadStatsData])

  // 初始化加载流程
  useEffect(() => {
    console.log('[ProgressiveTaskContext] 🚀 Initializing ProgressiveTaskContext at', new Date().toISOString())
    const init = async () => {
      console.log('[ProgressiveTaskContext] 📍 Starting init flow...')
      const inBusiness = await checkBusinessHours()
      if (inBusiness) {
        console.log('[ProgressiveTaskContext] 🏪 In business hours, starting progressive load...')
        // 立即开始加载当前期间任务
        console.log('[ProgressiveTaskContext] 📦 Loading current period tasks...')
        await loadCurrentPeriodTasks()
        // 异步加载统计数据
        console.log('[ProgressiveTaskContext] 📈 Triggering async stats load...')
        loadStatsData()
      } else {
        console.log('[ProgressiveTaskContext] 🌙 Not in business hours, skipping progressive load')
      }
    }

    init()
  }, [])

  // 渲染加载界面 - 使用统一的PageLoader组件
  if (loadingPhase === LoadingPhase.CHECKING_HOURS) {
    return <PageLoader message="正在检查营业状态..." />
  }

  // 不在营业时间的界面
  if (loadingPhase === LoadingPhase.NOT_IN_BUSINESS) {
    return children // 让子组件处理非营业时间的显示
  }

  return (
    <ProgressiveTaskContext.Provider
      value={{
        isInBusinessHours,
        currentPeriod,
        nextPeriod,
        loadingPhase,
        loadingProgress,
        currentPeriodTasks,
        currentPeriodLoading,
        floatingTasks,
        statsData,
        statsLoading,
        allPeriods,
        allPeriodsLoading,
        refresh
      }}
    >
      {children}
    </ProgressiveTaskContext.Provider>
  )
}

// 导出加载骨架屏组件
export const TaskCountdownSkeleton: React.FC = () => (
  <Box sx={{ p: 3 }}>
    <Stack spacing={2}>
      <Skeleton variant="rectangular" height={60} />
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Skeleton variant="rectangular" width="30%" height={100} />
        <Skeleton variant="rectangular" width="30%" height={100} />
        <Skeleton variant="rectangular" width="30%" height={100} />
      </Box>
    </Stack>
  </Box>
)

export const TaskSummarySkeleton: React.FC = () => (
  <Box sx={{ p: 2 }}>
    <Stack spacing={2}>
      <Skeleton variant="text" width="60%" height={30} />
      <LinearProgress variant="determinate" value={0} />
      <Stack spacing={1}>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} variant="rectangular" height={40} />
        ))}
      </Stack>
    </Stack>
  </Box>
)