// Redesigned App with role selection and improved architecture
import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Provider } from 'react-redux'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import { store } from './store'
import { TimeProvider } from './contexts/TimeContext'
import { RoleSelection } from './pages/RoleSelection'
import { ManagerDashboard } from './pages/ManagerDashboard-new'
import { ChefDashboard } from './pages/ChefDashboard-new'

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
    ].join(','),
  },
})

function App() {
  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <TimeProvider>
          <Router>
            <Routes>
              <Route path="/" element={<RoleSelection />} />
              <Route path="/dashboard/manager" element={<ManagerDashboard />} />
              <Route path="/dashboard/chef" element={<ChefDashboard />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </TimeProvider>
      </ThemeProvider>
    </Provider>
  )
}

export default App