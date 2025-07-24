// Main App component with routing and Realtime integration
// Updated: 2025-07-24 - Added login page and protected routes
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { LoginPage } from './pages/Login/LoginPage'
import { RoleSelection } from './pages/RoleSelection'
import { ManagerDashboard } from './pages/ManagerDashboard-new'
import { ChefDashboard } from './pages/ChefDashboard-new'
import DutyManagerDashboard from './pages/DutyManagerDashboard'
import TestFloatingCamera from './pages/TestFloatingCamera'
import { DutyManagerProvider } from './contexts/DutyManagerContext'
import { TaskDataProvider } from './contexts/TaskDataContext'
import { useEffect, useState } from 'react'
import { realtimeService } from './services/realtimeService'
import { Snackbar, Alert } from '@mui/material'
import { TestRealtime } from './pages/TestRealtime'
import { TestDatabase } from './pages/TestDatabase'
import TestFloatingTasks from './pages/TestFloatingTasks'
import { initializeStorage } from './utils/initializeStorage'
import NotificationPermission from './components/NotificationPermission/NotificationPermission'
import { PrivateRoute } from './components/PrivateRoute'

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
})

// Create router with React Router v7 syntax
const router = createBrowserRouter([
  {
    path: '/',
    element: <LoginPage />,
  },
  {
    path: '/role-selection',
    element: (
      <PrivateRoute>
        <RoleSelection />
      </PrivateRoute>
    ),
  },
  {
    path: '/manager',
    element: (
      <PrivateRoute path="/manager">
        <ManagerDashboard />
      </PrivateRoute>
    ),
  },
  {
    path: '/chef',
    element: (
      <PrivateRoute path="/chef">
        <ChefDashboard />
      </PrivateRoute>
    ),
  },
  {
    path: '/duty-manager',
    element: (
      <PrivateRoute path="/duty-manager">
        <DutyManagerDashboard />
      </PrivateRoute>
    ),
  },
  {
    path: '/test-camera',
    element: <TestFloatingCamera />,
  },
  {
    path: '/test-realtime',
    element: <TestRealtime />,
  },
  {
    path: '/test-database',
    element: <TestDatabase />,
  },
  {
    path: '/test-floating',
    element: <TestFloatingTasks />,
  },
])

function App() {
  const [realtimeStatus] = useState<string>('')
  const [showNotification, setShowNotification] = useState(false)

  useEffect(() => {
    // 初始化Storage
    initializeStorage()
    
    // 模拟用户登录后启动 Realtime
    // const initRealtime = async () => {
    //   try {
    //     // 这里应该从用户登录状态获取，现在模拟一个用户
    //     const mockUser = {
    //       id: 'test-user-id',
    //       restaurant_id: 'test-restaurant-id',
    //       role: 'manager'
    //     }

    //     // 订阅任务更新
    //     realtimeService.subscribeToTasks(mockUser.restaurant_id)
    //     realtimeService.subscribeToNotifications(mockUser.id)
    //     realtimeService.trackPresence(mockUser.id, mockUser.role)
        
    //     setRealtimeStatus('Realtime 服务已连接')
    //     setShowNotification(true)

    //     // 测试发送广播消息
    //     setTimeout(() => {
    //       realtimeService.sendBroadcast('系统测试：WebSocket 连接正常', 'normal')
    //     }, 2000)

    //   } catch (error) {
    //     console.error('Realtime initialization failed:', error)
    //     setRealtimeStatus('Realtime 连接失败')
    //     setShowNotification(true)
    //   }
    // }

    // 暂时注释掉自动初始化，等用户系统完善后再启用
    // initRealtime()

    return () => {
      realtimeService.unsubscribeAll()
    }
  }, [])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <TaskDataProvider>
        <DutyManagerProvider>
          <RouterProvider router={router} />
          <NotificationPermission />
        </DutyManagerProvider>
      </TaskDataProvider>
      <Snackbar 
        open={showNotification} 
        autoHideDuration={3000} 
        onClose={() => setShowNotification(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowNotification(false)} 
          severity={realtimeStatus.includes('失败') ? 'error' : 'success'}
        >
          {realtimeStatus}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  )
}

export default App