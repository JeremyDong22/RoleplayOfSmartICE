// Main App component with routing - Updated for React Router v7 compatibility
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { RoleSelection } from './pages/RoleSelection'
import { ManagerDashboard } from './pages/ManagerDashboard-new'
import { ChefDashboard } from './pages/ChefDashboard-new'
import { EmployeeDashboard } from './pages/EmployeeDashboard'

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
    element: <RoleSelection />,
  },
  {
    path: '/manager',
    element: <ManagerDashboard />,
  },
  {
    path: '/chef',
    element: <ChefDashboard />,
  },
  {
    path: '/front-employee',
    element: <EmployeeDashboard department="前厅" />,
  },
  {
    path: '/kitchen-employee',
    element: <EmployeeDashboard department="后厨" />,
  },
])

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  )
}

export default App