/**
 * App Layout Component with persistent Navigation Bar and Global Refresh Button
 * Created: 2025-08-22
 * Updated: 2025-08-27 - Added global refresh button
 * Purpose: Provides a shared layout with navigation bar and refresh button
 */

import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { NavigationBar } from '../Navigation/NavigationBar'
import { GlobalRefreshButton } from '../GlobalRefreshButton/GlobalRefreshButton'
import { authService } from '../../services/authService'

export const AppLayout: React.FC = () => {
  const location = useLocation()
  const currentUser = authService.getCurrentUser()
  
  // Convert database format (duty_manager) to route format (duty-manager)
  const roleCodeMap: Record<string, 'manager' | 'chef' | 'duty-manager' | 'ceo'> = {
    'manager': 'manager',
    'chef': 'chef',
    'duty_manager': 'duty-manager',
    'ceo': 'ceo'
  }
  
  // Get role from current path or from user session
  const getRoleFromPath = (): 'manager' | 'chef' | 'duty-manager' | 'ceo' | undefined => {
    if (location.pathname.includes('/manager')) return 'manager'
    if (location.pathname.includes('/chef')) return 'chef'
    if (location.pathname.includes('/duty-manager')) return 'duty-manager'
    if (location.pathname.includes('/ceo')) return 'ceo'
    
    // For inventory and other shared routes, check localStorage first (for administrators)
    const selectedRole = localStorage.getItem('selectedRole')
    if (selectedRole && ['manager', 'chef', 'duty-manager', 'ceo'].includes(selectedRole)) {
      return selectedRole as 'manager' | 'chef' | 'duty-manager' | 'ceo'
    }
    
    // Otherwise use the user's role from session
    if (currentUser?.roleCode) {
      return roleCodeMap[currentUser.roleCode]
    }
    
    return undefined
  }
  
  const userRole = getRoleFromPath()
  
  // Don't show refresh button on login or role selection pages
  const showRefreshButton = !location.pathname.includes('/login') && 
                           !location.pathname.includes('/role-selection') &&
                           !location.pathname.includes('/register')
  
  return (
    <>
      {/* Content area - will change when navigating */}
      <Outlet />
      
      {/* Global Refresh Button - floating above navigation */}
      {showRefreshButton && <GlobalRefreshButton />}
      
      {/* Navigation bar - stays persistent */}
      <NavigationBar role={userRole} />
    </>
  )
}