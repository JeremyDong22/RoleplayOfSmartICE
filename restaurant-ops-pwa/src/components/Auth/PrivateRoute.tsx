// Private route component for protecting routes based on authentication and roles
import type { FC, ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../../store'
import type { UserRole } from '../../types/database'
import { CircularProgress, Box } from '@mui/material'

interface PrivateRouteProps {
  children: ReactNode
  allowedRoles?: UserRole[]
}

export const PrivateRoute: FC<PrivateRouteProps> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useSelector((state: RootState) => state.auth)

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    switch (user.role) {
      case 'CEO':
        return <Navigate to="/ceo-dashboard" replace />
      case 'Manager':
        return <Navigate to="/manager-dashboard" replace />
      case 'Chef':
        return <Navigate to="/chef-dashboard" replace />
      default:
        return <Navigate to="/tasks" replace />
    }
  }

  return <>{children}</>
}