// Main App component with routing and theme configuration
import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Provider } from 'react-redux'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import { store } from './store'
// import { AuthProvider } from './components/Auth/AuthProvider'
import { SimpleLogin as Login } from './pages/Login/SimpleLogin'
// import { PrivateRoute } from './components/Auth/PrivateRoute'
// import { CEODashboard } from './pages/CEODashboard/CEODashboard'
// import { ManagerDashboard } from './pages/ManagerDashboard/ManagerDashboard'
// import { ChefDashboard } from './pages/ChefDashboard/ChefDashboard'
// import { TaskManagement } from './pages/TaskManagement/TaskManagement'

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
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </Provider>
  )
}

export default App