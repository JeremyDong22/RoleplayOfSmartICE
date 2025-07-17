// Main App component with routing and theme configuration
import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Provider } from 'react-redux'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import { zhCN } from '@mui/material/locale'
import { store } from './store'
import { AuthProvider } from './components/Auth/AuthProvider'
import { Login } from './pages/Login/Login'
import { PrivateRoute } from './components/Auth/PrivateRoute'
import { CEODashboard } from './pages/CEODashboard/CEODashboard'
import { ManagerDashboard } from './pages/ManagerDashboard/ManagerDashboard'
import { ChefDashboard } from './pages/ChefDashboard/ChefDashboard'
import { TaskManagement } from './pages/TaskManagement/TaskManagement'

// Create MUI theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
  },
}, zhCN)

function App() {
  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => console.log('SW registered:', registration))
          .catch(error => console.log('SW registration failed:', error))
      })
    }
  }, [])

  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/ceo-dashboard" element={
                <PrivateRoute allowedRoles={['CEO']}>
                  <CEODashboard />
                </PrivateRoute>
              } />
              <Route path="/manager-dashboard" element={
                <PrivateRoute allowedRoles={['Manager']}>
                  <ManagerDashboard />
                </PrivateRoute>
              } />
              <Route path="/chef-dashboard" element={
                <PrivateRoute allowedRoles={['Chef']}>
                  <ChefDashboard />
                </PrivateRoute>
              } />
              <Route path="/tasks" element={
                <PrivateRoute allowedRoles={['CEO', 'Manager', 'Chef', 'Staff']}>
                  <TaskManagement />
                </PrivateRoute>
              } />
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </Provider>
  )
}

export default App
