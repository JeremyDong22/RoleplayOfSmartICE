// Main App component with routing and Realtime integration
// Updated: 2025-07-31 - Added restaurant initialization
// Updated: 2025-08-03 - Added automatic cache management
// Updated: 2025-08-04 - Added force clear cache button
// Updated: 2025-08-11 - Added face-api.js face recognition
// Updated: 2025-08-12 - Removed FaceIO, implemented auto face detection
// Updated: 2025-01-13 - Fixed auth initialization timing
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
import { TestParallelUpload } from './pages/TestParallelUpload'
import { initializeStorage } from './utils/initializeStorage'
import NotificationPermission from './components/NotificationPermission/NotificationPermission'
import { PrivateRoute } from './components/PrivateRoute'
import { restaurantConfigService } from './services/restaurantConfigService'
import { authService } from './services/authService'
import { enableSupabaseDebug, testSupabaseQueries } from './utils/debugSupabase'
import { TestRealtimeDebug } from './pages/TestRealtimeDebug'
import { initializeCacheManager } from './utils/cacheManager'
import { CacheManagerUI } from './components/CacheManager/CacheManagerUI'
import { ClearCacheButton } from './components/ClearCacheButton/ClearCacheButton'
import { faceModelManager } from './services/faceModelManager'
import { supabase } from './services/supabase'

// CEO Dashboard imports
import { CEODashboardDB as CEODashboard } from './pages/CEODashboard/CEODashboardDB'
import { DebugAuth } from './pages/DebugAuth'
import { NotificationsPage } from './pages/NotificationsPage'

// Inventory Management import
import { InventoryManagement } from './pages/InventoryManagement/InventoryManagement'
import { AppLayout } from './components/Layout/AppLayout'
import { RefreshProvider } from './contexts/RefreshContext'

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

// Create router with React Router v7 syntax - using nested routes for shared layout
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
  // Manager routes with shared layout
  {
    path: '/manager',
    element: (
      <PrivateRoute path="/manager">
        <AppLayout />
      </PrivateRoute>
    ),
    children: [
      {
        index: true,
        element: <ManagerDashboard />,
      },
      {
        path: 'profile',
        element: <ProfilePageEnhanced />,
      },
      {
        path: 'notifications',
        element: <NotificationsPage role="manager" />,
      },
    ],
  },
  // Chef routes with shared layout
  {
    path: '/chef',
    element: (
      <PrivateRoute path="/chef">
        <AppLayout />
      </PrivateRoute>
    ),
    children: [
      {
        index: true,
        element: <ChefDashboard />,
      },
      {
        path: 'profile',
        element: <ProfilePageEnhanced />,
      },
      {
        path: 'notifications',
        element: <NotificationsPage role="chef" />,
      },
    ],
  },
  // Duty Manager routes with shared layout
  {
    path: '/duty-manager',
    element: (
      <PrivateRoute path="/duty-manager">
        <AppLayout />
      </PrivateRoute>
    ),
    children: [
      {
        index: true,
        element: <DutyManagerDashboard />,
      },
      {
        path: 'profile',
        element: <ProfilePageEnhanced />,
      },
      {
        path: 'notifications',
        element: <NotificationsPage role="duty-manager" />,
      },
    ],
  },
  // CEO routes with shared layout
  {
    path: '/ceo',
    element: (
      <PrivateRoute path="/ceo">
        <AppLayout />
      </PrivateRoute>
    ),
    children: [
      {
        index: true,
        element: <CEODashboard />,
      },
      {
        path: 'profile',
        element: <ProfilePageEnhanced />,
      },
      {
        path: 'notifications',
        element: <NotificationsPage role="ceo" />,
      },
    ],
  },
  // Inventory Management route with shared layout
  {
    path: '/inventory',
    element: (
      <PrivateRoute path="/inventory">
        <AppLayout />
      </PrivateRoute>
    ),
    children: [
      {
        index: true,
        element: <InventoryManagement />,
      },
    ],
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
    path: '/test-parallel-upload',
    element: <TestParallelUpload />,
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
    // Use a flag to prevent double initialization in StrictMode
    let initialized = false
    
    const initializeApp = async () => {
      if (initialized) return
      initialized = true
      
      // 初始化缓存管理器（必须最先执行）
      initializeCacheManager()
      
      // 初始化Storage
      initializeStorage()
      
      // Initialize restaurant config if user is already logged in (Cookie-based auth)
      // Note: We don't use Supabase Auth, we use our custom auth with cookies
      const currentUser = authService.getCurrentUser()
      if (currentUser) {
        console.log('[App] User authenticated via Cookie, initializing restaurant config...')
        await restaurantConfigService.initialize()
      }
      
      // Enable Supabase debugging only in development
      if (import.meta.env.DEV) {
        enableSupabaseDebug();
        // Run test queries after services are initialized
        setTimeout(() => {
          testSupabaseQueries();
        }, 2000);
      }
      
      // 预加载人脸识别模型（后台加载，不阻塞）
      // 在iOS设备上可能需要更长的加载时间
      console.log('[App] Starting face model preload...')
      // 延迟加载以避免与其他初始化冲突
      setTimeout(() => {
        faceModelManager.preloadInBackground()
      }, 1000)
    }
    
    // Add small delay to batch initialization and avoid race conditions
    const timer = setTimeout(() => {
      initializeApp()
    }, 10)
    
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
      clearTimeout(timer)
      realtimeService.unsubscribeAll()
    }
  }, [])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RefreshProvider>
        <TaskDataProvider>
          <DutyManagerProvider>
            <RouterProvider router={router} />
            <NotificationPermission />
            <CacheManagerUI />
            <ClearCacheButton />
          </DutyManagerProvider>
        </TaskDataProvider>
      </RefreshProvider>
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