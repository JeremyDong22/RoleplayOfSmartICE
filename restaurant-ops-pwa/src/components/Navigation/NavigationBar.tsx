// Navigation bar component for restaurant operations
// Provides navigation between tasks and profile pages

import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Badge
} from '@mui/material'
import {
  Assignment,
  Person,
  Dashboard,
  Notifications
} from '@mui/icons-material'

interface NavigationBarProps {
  role: 'manager' | 'chef' | 'duty-manager'
}

export const NavigationBar: React.FC<NavigationBarProps> = ({ role }) => {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Map role to route
  const roleRoutes = {
    'manager': '/manager',
    'chef': '/chef',
    'duty-manager': '/duty-manager'
  }
  
  const baseRoute = roleRoutes[role]
  
  // Determine current value based on pathname
  const getCurrentValue = () => {
    if (location.pathname.includes('/profile')) return 1
    if (location.pathname.includes('/notifications')) return 2
    return 0 // Default to tasks
  }
  
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    switch (newValue) {
      case 0:
        navigate(baseRoute)
        break
      case 1:
        navigate(`${baseRoute}/profile`)
        break
      case 2:
        navigate(`${baseRoute}/notifications`)
        break
    }
  }
  
  return (
    <Paper 
      sx={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0,
        zIndex: 1200
      }} 
      elevation={3}
    >
      <BottomNavigation
        value={getCurrentValue()}
        onChange={handleChange}
        showLabels
      >
        <BottomNavigationAction
          label="任务"
          icon={<Assignment />}
        />
        <BottomNavigationAction
          label="个人中心"
          icon={<Person />}
        />
        <BottomNavigationAction
          label="通知"
          icon={
            <Badge badgeContent={0} color="error">
              <Notifications />
            </Badge>
          }
        />
      </BottomNavigation>
    </Paper>
  )
}