// Main App component with routing and context providers
// Version 3.0 - Refactored: Cleaned imports, simplified ErrorBoundary nesting, conditional test routes
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { lazy, Suspense, useEffect } from 'react'
import { CircularProgress, Box } from '@mui/material'

// Core Components
import { LoginPageEnhanced } from './pages/Login/LoginPageEnhanced'
import { RoleSelection } from './pages/RoleSelection'
import { ErrorBoundary } from './components/ErrorBoundary'
import { PrivateRoute } from './components/PrivateRoute'
import { AppLayout } from './components/Layout/AppLayout'
import { TaskReminderBanner } from './components/TaskReminderBanner/TaskReminderBanner'
import ProfilePageEnhanced from './pages/ProfilePage/ProfilePageEnhanced'
import { NotificationsPage } from './pages/NotificationsPage'

// Context Providers
import { RefreshProvider } from './contexts/RefreshContext'
import { TaskDataProvider } from './contexts/TaskDataContext'
import { DutyManagerProvider } from './contexts/DutyManagerContext'

// Services
import { realtimeService } from './services/realtimeService'
import { restaurantConfigService } from './services/restaurantConfigService'
import { authService } from './services/authService'
import { initializeStorage } from './utils/initializeStorage'
import { initializeCacheManager } from './utils/cacheManager'
import { initServiceWorkerCleanup } from './utils/cleanupOldServiceWorker'

// Lazy-loaded Dashboards
const ManagerDashboard = lazy(() =>
  import('./pages/ManagerDashboard-new').then(module => ({ default: module.ManagerDashboard }))
)
const ChefDashboard = lazy(() =>
  import('./pages/ChefDashboard-new').then(module => ({ default: module.ChefDashboard }))
)
const DutyManagerDashboard = lazy(() => import('./pages/DutyManagerDashboard'))
const CEODashboard = lazy(() =>
  import('./pages/CEODashboard/CEODashboardDB').then(module => ({ default: module.CEODashboardDB }))
)

// Test Pages (only imported in development)
const TestFloatingCamera = lazy(() => import('./pages/TestFloatingCamera'))
const TestRealtime = lazy(() => import('./pages/TestRealtime').then(m => ({ default: m.TestRealtime })))
const TestDatabase = lazy(() => import('./pages/TestDatabase').then(m => ({ default: m.TestDatabase })))
const TestFloatingTasks = lazy(() => import('./pages/TestFloatingTasks'))
const TestTaskUpload = lazy(() => import('./pages/TestTaskUpload'))
const TestRealtimeDebug = lazy(() => import('./pages/TestRealtimeDebug').then(m => ({ default: m.TestRealtimeDebug })))
const DebugAuth = lazy(() => import('./pages/DebugAuth').then(m => ({ default: m.DebugAuth })))
const Puppeteer = lazy(() => import('./pages/Puppeteer').then(m => ({ default: m.Puppeteer })))
const TestProgressiveImage = lazy(() => import('./pages/TestProgressiveImage'))

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

// Test routes - only available in development
const testRoutes = import.meta.env.DEV ? [
  {
    path: '/test-camera',
    element: (
      <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>}>
        <TestFloatingCamera />
      </Suspense>
    ),
  },
  {
    path: '/test-realtime',
    element: (
      <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>}>
        <TestRealtime />
      </Suspense>
    ),
  },
  {
    path: '/test-database',
    element: (
      <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>}>
        <TestDatabase />
      </Suspense>
    ),
  },
  {
    path: '/test-floating',
    element: (
      <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>}>
        <TestFloatingTasks />
      </Suspense>
    ),
  },
  {
    path: '/test-upload',
    element: (
      <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>}>
        <TestTaskUpload />
      </Suspense>
    ),
  },
  {
    path: '/test-realtime-debug',
    element: (
      <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>}>
        <TestRealtimeDebug />
      </Suspense>
    ),
  },
  {
    path: '/debug-auth',
    element: (
      <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>}>
        <DebugAuth />
      </Suspense>
    ),
  },
  {
    path: '/puppeteer',
    element: (
      <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>}>
        <Puppeteer />
      </Suspense>
    ),
  },
  {
    path: '/test-progressive',
    element: (
      <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>}>
        <TestProgressiveImage />
      </Suspense>
    ),
  },
] : []

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
        element: (
          <Suspense fallback={null}>
            <ManagerDashboard />
          </Suspense>
        ),
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
        element: (
          <Suspense fallback={null}>
            <ChefDashboard />
          </Suspense>
        ),
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
        element: (
          <Suspense fallback={null}>
            <DutyManagerDashboard />
          </Suspense>
        ),
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
  // Spread test routes (only in development)
  ...testRoutes,
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
  useEffect(() => {
    let initialized = false

    const initializeApp = async () => {
      if (initialized) return
      initialized = true

      try {
        // Initialize core services and cleanup old SW
        initServiceWorkerCleanup()
        initializeCacheManager()
        initializeStorage()

        // Initialize restaurant config if user is logged in
        const currentUser = authService.getCurrentUser()
        if (currentUser) {
          await restaurantConfigService.initialize()
        }

        console.log('✅ Services initialized')
      } catch (error) {
        console.error('❌ Initialization error:', error)
      }
    }

    // Add small delay to batch initialization and avoid race conditions
    const timer = setTimeout(() => {
      initializeApp()
    }, 10)

    return () => {
      clearTimeout(timer)
      realtimeService.unsubscribeAll()
    }
  }, [])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <RefreshProvider>
          <TaskDataProvider>
            <DutyManagerProvider>
              <RouterProvider router={router} />
            </DutyManagerProvider>
          </TaskDataProvider>
        </RefreshProvider>
      </ErrorBoundary>
    </ThemeProvider>
  )
}

export default App