// PrivateRoute component to protect authenticated routes
// Created: 2025-07-24 - Ensures only logged-in users can access protected pages
import { Navigate } from 'react-router-dom'
import { authService } from '../services/authService'

interface PrivateRouteProps {
  children: React.ReactNode
  path?: string
}

export const PrivateRoute = ({ children, path }: PrivateRouteProps) => {
  const isAuthenticated = authService.isAuthenticated()
  
  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/" replace />
  }

  // Check route-specific permissions if path is provided
  if (path && !authService.canAccessRoute(path)) {
    // Redirect to role selection if user doesn't have permission
    return <Navigate to="/role-selection" replace />
  }

  return <>{children}</>
}