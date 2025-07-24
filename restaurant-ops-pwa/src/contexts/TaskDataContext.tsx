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
  

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // 初始化任务服务
      const initialized = await taskService.initialize()
      
      if (!initialized) {
        // 如果初始化失败，显示具体的错误信息
        setError('无法连接到服务器，请检查网络连接。系统将在5秒后自动重试。')
        // 5秒后自动重试
        setTimeout(() => {
          loadData()
        }, 5000)
        return
      }
      
      // 获取数据
      const periods = taskService.getWorkflowPeriods()
      const floating = taskService.getFloatingTasks()
      
      setWorkflowPeriods(periods)
      setFloatingTasks(floating)
      
      // 订阅更新
      const unsubscribeTasks = taskService.subscribe('tasks', (data) => {
        // 当任务更新时，重新获取所有数据
        const updatedPeriods = taskService.getWorkflowPeriods()
        const updatedFloating = taskService.getFloatingTasks()
        
        // 防止空数据覆盖有效数据
        setFloatingTasks(prev => {
          if (updatedFloating.length > 0 || prev.length === 0) {
            return updatedFloating
          } else {
            return prev
          }
        })
        
        setWorkflowPeriods(updatedPeriods)
      })
      
      const unsubscribePeriods = taskService.subscribe('periods', (data) => {
        setWorkflowPeriods(data)
      })
      
      // 清理函数
      return () => {
        unsubscribeTasks()
        unsubscribePeriods()
      }
      
    } catch (err: any) {
      console.error('Failed to load task data:', err)
      setError(`加载任务数据失败: ${err.message || '未知错误'}`)
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
        sx={{ backgroundColor: '#f5f5f5', padding: 3 }}
      >
        <Box 
          sx={{ 
            backgroundColor: 'white',
            padding: 4,
            borderRadius: 2,
            boxShadow: 2,
            maxWidth: 500,
            textAlign: 'center'
          }}
        >
          <Box 
            component="h2" 
            sx={{ 
              color: 'error.main',
              marginBottom: 2,
              fontSize: '1.5rem'
            }}
          >
            连接错误
          </Box>
          <Box sx={{ marginBottom: 3, color: 'text.secondary' }}>
            {error}
          </Box>
          {error.includes('自动重试') ? (
            <CircularProgress size={24} />
          ) : (
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
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'primary.dark'
                }
              }}
            >
              重试
            </Box>
          )}
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