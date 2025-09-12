// PrivateRouteHybrid component - supports both legacy and Supabase Auth
// Created: 2025-01-12 - Dual authentication support during migration
import { Navigate } from 'react-router-dom'
import { authHybridService } from '../services/authHybridService'
import { useEffect, useState } from 'react'
import { CircularProgress, Box } from '@mui/material'

interface PrivateRouteHybridProps {
  children: React.ReactNode
  path?: string
}

export const PrivateRouteHybrid = ({ children, path }: PrivateRouteHybridProps) => {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [canAccess, setCanAccess] = useState(true)
  
  useEffect(() => {
    checkAuth()
  }, [path])
  
  const checkAuth = async () => {
    try {
      // Check if user is authenticated
      const authenticated = await authHybridService.isAuthenticated()
      setIsAuthenticated(authenticated)
      
      // Check route-specific permissions if authenticated and path is provided
      if (authenticated && path) {
        const hasAccess = await authHybridService.canAccessRoute(path)
        setCanAccess(hasAccess)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh'
        }}
      >
        <CircularProgress />
      </Box>
    )
  }
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }
  
  // Redirect to role selection if user doesn't have permission
  if (!canAccess) {
    return <Navigate to="/role-selection" replace />
  }
  
  return <>{children}</>
}