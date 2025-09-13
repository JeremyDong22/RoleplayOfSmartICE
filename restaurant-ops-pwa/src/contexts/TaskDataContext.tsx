/**
 * 任务数据上下文
 * 管理从数据库加载的任务数据并提供给整个应用
 * Updated: 2025-09-05 - Removed console.log statements for production optimization
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { taskService } from '../services/taskService'
import { authService } from '../services/authService'
import type { WorkflowPeriod, TaskTemplate } from '../types/task.types'
import { CircularProgress, Box } from '@mui/material'

interface TaskDataContextType {
  workflowPeriods: WorkflowPeriod[]
  floatingTasks: TaskTemplate[]
  isLoading: boolean
  loadingProgress: number  // 0-100
  loadingMessage: string   // 当前加载步骤
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
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState('正在初始化...')
  const [error, setError] = useState<string | null>(null)
  

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      setLoadingProgress(0)
      setLoadingMessage('正在连接服务器...')

      // 初始化任务服务 - 传入进度回调
      const initialized = await taskService.initialize((progress, message) => {
        setLoadingProgress(progress)
        setLoadingMessage(message)
      })
      
      if (!initialized) {
        // Check if user is authenticated using Cookie-based auth (NOT Supabase Auth)
        // This checks our custom authentication from authService
        const currentUser = authService.getCurrentUser()
        if (!currentUser) {
          // 用户未登录，这是正常的，不需要显示错误
          return
        }
        
        // 如果有会话但初始化失败，显示具体的错误信息
        setError('无法连接到服务器，请检查网络连接。系统将在5秒后自动重试。')
        // 5秒后自动重试
        setTimeout(() => {
          loadData()
        }, 5000)
        return
      }
      
      // 获取数据
      setLoadingProgress(90)
      setLoadingMessage('正在整理数据...')
      const periods = taskService.getWorkflowPeriods()
      const floating = taskService.getFloatingTasks()

      setWorkflowPeriods(periods)
      setFloatingTasks(floating)
      setLoadingProgress(100)
      setLoadingMessage('加载完成！')
      
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
        gap={3}
        sx={{ backgroundColor: '#f5f5f5' }}
      >
        <Box
          sx={{
            position: 'relative',
            display: 'inline-flex',
          }}
        >
          <CircularProgress
            variant="determinate"
            value={loadingProgress}
            size={80}
            thickness={4}
          />
          <Box
            sx={{
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box
              component="span"
              sx={{
                fontSize: '1.25rem',
                fontWeight: 'bold',
                color: 'primary.main'
              }}
            >
              {loadingProgress}%
            </Box>
          </Box>
        </Box>

        <Box sx={{
          textAlign: 'center',
          animation: 'pulse 1.5s ease-in-out infinite',
          '@keyframes pulse': {
            '0%': { opacity: 1 },
            '50%': { opacity: 0.7 },
            '100%': { opacity: 1 },
          }
        }}>
          <Box sx={{ fontSize: '1.125rem', fontWeight: 500, mb: 1 }}>
            {loadingMessage}
          </Box>
          <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
            请稍候，正在准备您的工作环境...
          </Box>
        </Box>

        {/* 进度条 */}
        <Box sx={{ width: '300px' }}>
          <Box sx={{
            height: 6,
            backgroundColor: 'rgba(0,0,0,0.1)',
            borderRadius: 3,
            overflow: 'hidden'
          }}>
            <Box sx={{
              height: '100%',
              width: `${loadingProgress}%`,
              backgroundColor: 'primary.main',
              borderRadius: 3,
              transition: 'width 0.3s ease-in-out'
            }} />
          </Box>
        </Box>
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
        loadingProgress,
        loadingMessage,
        error,
        refresh
      }}
    >
      {children}
    </TaskDataContext.Provider>
  )
}