/**
 * 任务数据上下文
 * 管理从数据库加载的任务数据并提供给整个应用
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { taskService } from '../services/taskService'
import type { WorkflowPeriod, TaskTemplate } from '../utils/workflowParser'
import { CircularProgress, Box } from '@mui/material'

interface TaskDataContextType {
  workflowPeriods: WorkflowPeriod[]
  floatingTasks: TaskTemplate[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const TaskDataContext = createContext<TaskDataContextType | undefined>(undefined)

export const useTaskData = () => {
  const context = useContext(TaskDataContext)
  if (!context) {
    throw new Error('useTaskData must be used within TaskDataProvider')
  }
  return context
}

interface TaskDataProviderProps {
  children: React.ReactNode
}

export const TaskDataProvider: React.FC<TaskDataProviderProps> = ({ children }) => {
  const [workflowPeriods, setWorkflowPeriods] = useState<WorkflowPeriod[]>([])
  const [floatingTasks, setFloatingTasks] = useState<TaskTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Debug state changes
  useEffect(() => {
    console.log('=== TaskDataContext State Update ===')
    console.log('floatingTasks state:', floatingTasks)
    console.log('isLoading:', isLoading)
  }, [floatingTasks, isLoading])

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // 初始化任务服务
      await taskService.initialize()
      
      // 获取数据
      const periods = taskService.getWorkflowPeriods()
      const floating = taskService.getFloatingTasks()
      
      console.log('=== TaskDataContext Debug ===')
      console.log('Loaded periods:', periods.length)
      console.log('Loaded floating tasks:', floating)
      console.log('Floating tasks count:', floating.length)
      
      setWorkflowPeriods(periods)
      setFloatingTasks(floating)
      
      // 订阅更新
      const unsubscribeTasks = taskService.subscribe('tasks', (data) => {
        console.log('Tasks subscription update received:', data)
        // 当任务更新时，重新获取所有数据
        const updatedPeriods = taskService.getWorkflowPeriods()
        const updatedFloating = taskService.getFloatingTasks()
        
        // 防止空数据覆盖有效数据
        setFloatingTasks(prev => {
          if (updatedFloating.length > 0 || prev.length === 0) {
            console.log('Updating floating tasks from subscription:', updatedFloating)
            return updatedFloating
          } else {
            console.log('Skipping empty floating tasks update to preserve existing data')
            return prev
          }
        })
        
        setWorkflowPeriods(updatedPeriods)
      })
      
      const unsubscribePeriods = taskService.subscribe('periods', (data) => {
        console.log('Periods subscription update received:', data)
        setWorkflowPeriods(data)
      })
      
      // 清理函数
      return () => {
        unsubscribeTasks()
        unsubscribePeriods()
      }
      
    } catch (err) {
      console.error('Failed to load task data:', err)
      setError('加载任务数据失败，请刷新页面重试')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let cleanup: (() => void) | undefined
    
    loadData().then(cleanupFn => {
      cleanup = cleanupFn
    })
    
    return () => {
      cleanup?.()
      taskService.cleanup()
    }
  }, [loadData])

  const refresh = useCallback(async () => {
    await loadData()
  }, [loadData])

  // 加载中显示
  if (isLoading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        flexDirection="column"
        gap={2}
      >
        <CircularProgress />
        <Box>正在加载任务数据...</Box>
      </Box>
    )
  }

  // 错误显示
  if (error) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        flexDirection="column"
        gap={2}
      >
        <Box color="error.main">{error}</Box>
        <Box 
          component="button" 
          onClick={refresh}
          sx={{ 
            px: 2, 
            py: 1, 
            bgcolor: 'primary.main',
            color: 'white',
            border: 'none',
            borderRadius: 1,
            cursor: 'pointer'
          }}
        >
          重试
        </Box>
      </Box>
    )
  }

  return (
    <TaskDataContext.Provider 
      value={{ 
        workflowPeriods, 
        floatingTasks, 
        isLoading, 
        error, 
        refresh 
      }}
    >
      {children}
    </TaskDataContext.Provider>
  )
}