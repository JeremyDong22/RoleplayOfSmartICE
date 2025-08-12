// Main App component with routing and Realtime integration
// Updated: 2025-07-31 - Added restaurant initialization
// Updated: 2025-08-03 - Added automatic cache management
// Updated: 2025-08-04 - Added force clear cache button
// Updated: 2025-08-11 - Added face-api.js face recognition
// Updated: 2025-08-12 - Removed FaceIO, implemented auto face detection
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { LoginPageEnhanced } from './pages/Login/LoginPageEnhanced'
import { RoleSelection } from './pages/RoleSelection'
import { ManagerDashboard } from './pages/ManagerDashboard-new'
import { ChefDashboard } from './pages/ChefDashboard-new'
import DutyManagerDashboard from './pages/DutyManagerDashboard'
import ProfilePageEnhanced from './pages/ProfilePage/ProfilePageEnhanced'
import TestFloatingCamera from './pages/TestFloatingCamera'
import { DutyManagerProvider } from './contexts/DutyManagerContext'
import { TaskDataProvider } from './contexts/TaskDataContext'
import { useEffect, useState } from 'react'
import { realtimeService } from './services/realtimeService'
import { Snackbar, Alert } from '@mui/material'
import { TestRealtime } from './pages/TestRealtime'
import { TestDatabase } from './pages/TestDatabase'
import TestFloatingTasks from './pages/TestFloatingTasks'
import TestTaskUpload from './pages/TestTaskUpload'
import { initializeStorage } from './utils/initializeStorage'
import NotificationPermission from './components/NotificationPermission/NotificationPermission'
import { PrivateRoute } from './components/PrivateRoute'
import { initializeRestaurant } from './utils/restaurantSetup'
import { TestRealtimeDebug } from './pages/TestRealtimeDebug'
import { initializeCacheManager } from './utils/cacheManager'
import { CacheManagerUI } from './components/CacheManager/CacheManagerUI'
import { ClearCacheButton } from './components/ClearCacheButton/ClearCacheButton'

// CEO Dashboard imports
import { CEODashboardDB as CEODashboard } from './pages/CEODashboard/CEODashboardDB'
import { DebugAuth } from './pages/DebugAuth'
import { NotificationsPage } from './pages/NotificationsPage'

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
    element: <LoginPageEnhanced />,
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
    path: '/manager/profile',
    element: (
      <PrivateRoute path="/manager/profile">
        <ProfilePageEnhanced />
      </PrivateRoute>
    ),
  },
  {
    path: '/manager/notifications',
    element: (
      <PrivateRoute path="/manager/notifications">
        <NotificationsPage role="manager" />
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
    path: '/chef/profile',
    element: (
      <PrivateRoute path="/chef/profile">
        <ProfilePageEnhanced />
      </PrivateRoute>
    ),
  },
  {
    path: '/chef/notifications',
    element: (
      <PrivateRoute path="/chef/notifications">
        <NotificationsPage role="chef" />
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
    path: '/duty-manager/profile',
    element: (
      <PrivateRoute path="/duty-manager/profile">
        <ProfilePageEnhanced />
      </PrivateRoute>
    ),
  },
  {
    path: '/duty-manager/notifications',
    element: (
      <PrivateRoute path="/duty-manager/notifications">
        <NotificationsPage role="duty-manager" />
      </PrivateRoute>
    ),
  },
  // CEO Dashboard routes
  {
    path: '/ceo',
    element: (
      <PrivateRoute path="/ceo">
        <CEODashboard />
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
  {
    path: '/test-upload',
    element: <TestTaskUpload />,
  },
  {
    path: '/test-realtime-debug',
    element: <TestRealtimeDebug />,
  },
  {
    path: '/debug-auth',
    element: <DebugAuth />,
  },
  // Catch-all redirect for incorrect profile routes
  {
    path: '/manager/profile/:userId/notifications',
    element: <Navigate to="/manager/notifications" replace />,
  },
  {
    path: '/chef/profile/:userId/notifications',
    element: <Navigate to="/chef/notifications" replace />,
  },
  {
    path: '/duty-manager/profile/:userId/notifications',
    element: <Navigate to="/duty-manager/notifications" replace />,
  },
  // Catch-all route for 404 errors
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])

function App() {
  const [realtimeStatus] = useState<string>('')
  const [showNotification, setShowNotification] = useState(false)

  useEffect(() => {
    // 初始化缓存管理器（必须最先执行）
    initializeCacheManager()
    
    // 初始化Storage
    initializeStorage()
    
    // 初始化餐厅设置
    initializeRestaurant()
    
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
          <CacheManagerUI />
          <ClearCacheButton />
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