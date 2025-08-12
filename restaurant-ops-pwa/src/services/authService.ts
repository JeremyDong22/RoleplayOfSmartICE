// Authentication service for managing user login state
// Created: 2025-07-24 - Handles auth state with cookies and Supabase
import Cookies from 'js-cookie'
import { supabase } from './supabase'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  roleCode: string
  restaurantId: string
  display_name?: string
  role_name?: string
  face_descriptor?: number[] | null
}

class AuthService {
  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!Cookies.get('authToken')
  }

  // Get current user from cookies
  getCurrentUser(): AuthUser | null {
    const authToken = Cookies.get('authToken')
    if (!authToken) return null

    try {
      const name = Cookies.get('userName') || ''
      const role = Cookies.get('userRole') || ''
      return {
        id: Cookies.get('userId') || '',
        email: Cookies.get('userEmail') || '',
        name: name,
        display_name: name, // Same as name for compatibility
        role: role,
        role_name: role, // Same as role for compatibility
        roleCode: Cookies.get('userRoleCode') || '',
        restaurantId: Cookies.get('restaurantId') || ''
      }
    } catch {
      return null
    }
  }

  // Login user with username and password
  async login(username: string, password: string): Promise<{ user: AuthUser; error?: string }> {
    try {
      // Query user by username
      const { data: userData, error: userError } = await supabase
        .from('roleplay_users')
        .select(`
          *,
          roleplay_roles (
            role_code,
            role_name_zh,
            role_name_en
          )
        `)
        .eq('username', username)
        .eq('is_active', true)
        .single()

      if (userError || !userData) {
        return { user: null as any, error: '用户名或密码错误' }
      }

      // For demo purposes, we'll use a simple password check
      // In production, this should use proper auth
      const expectedPassword = `${username}123` // Simple demo password pattern
      if (password !== expectedPassword) {
        return { user: null as any, error: '用户名或密码错误' }
      }

      // Debug: Log the userData to see structure
      console.log('Login userData:', userData)
      console.log('Role data:', userData.roleplay_roles)
      
      // Create auth session - handle both single object and array response
      const roleData = Array.isArray(userData.roleplay_roles) 
        ? userData.roleplay_roles[0] 
        : userData.roleplay_roles
      
      const authUser: AuthUser = {
        id: userData.id,
        email: `${username}@restaurant.com`,
        name: userData.full_name,
        role: roleData?.role_name_zh || '',
        roleCode: roleData?.role_code || '',
        restaurantId: userData.restaurant_id
      }

      // Store in cookies
      Cookies.set('authToken', 'demo-token-' + userData.id, { expires: 7 })
      Cookies.set('userId', authUser.id, { expires: 7 })
      Cookies.set('userEmail', authUser.email, { expires: 7 })
      Cookies.set('userName', authUser.name, { expires: 7 })
      Cookies.set('userRole', authUser.role, { expires: 7 })
      Cookies.set('userRoleCode', authUser.roleCode, { expires: 7 })
      Cookies.set('restaurantId', authUser.restaurantId, { expires: 7 })

      return { user: authUser }
    } catch (error: any) {
      console.error('Login error:', error)
      return { user: null as any, error: error.message || '登录失败' }
    }
  }

  // Logout user
  logout(): void {
    // Clear all auth cookies
    Cookies.remove('authToken')
    Cookies.remove('userId')
    Cookies.remove('userEmail')
    Cookies.remove('userName')
    Cookies.remove('userRole')
    Cookies.remove('userRoleCode')
    Cookies.remove('restaurantId')

    // Sign out from Supabase
    supabase.auth.signOut()
  }

  // Check if user has specific role
  hasRole(roleCode: string): boolean {
    const user = this.getCurrentUser()
    return user?.roleCode === roleCode
  }

  // Check if user can access a specific route
  canAccessRoute(path: string): boolean {
    const user = this.getCurrentUser()
    if (!user) return false

    // Administrator can access all routes
    if (user.roleCode === 'administrator') {
      return true
    }

    // Map routes to allowed roles
    const routePermissions: Record<string, string[]> = {
      '/manager': ['manager'],
      '/chef': ['chef'],
      '/duty-manager': ['duty_manager', 'manager'], // Manager can also access duty manager
      '/ceo': ['ceo']
    }

    const allowedRoles = routePermissions[path]
    if (!allowedRoles) return true // Allow if no specific permission required

    return allowedRoles.includes(user.roleCode)
  }

  // Update user cache with new data
  updateUserCache(userData: Partial<AuthUser>): void {
    const currentUser = this.getCurrentUser()
    if (!currentUser) return

    const updatedUser = { ...currentUser, ...userData }
    
    // Update cookies with new data
    if (userData.id) Cookies.set('userId', updatedUser.id, { expires: 7 })
    if (userData.email) Cookies.set('userEmail', updatedUser.email, { expires: 7 })
    if (userData.name) Cookies.set('userName', updatedUser.name, { expires: 7 })
    if (userData.role) Cookies.set('userRole', updatedUser.role, { expires: 7 })
    if (userData.roleCode) Cookies.set('userRoleCode', updatedUser.roleCode, { expires: 7 })
    if (userData.restaurantId) Cookies.set('restaurantId', updatedUser.restaurantId, { expires: 7 })
    
    // Note: face_descriptor is not stored in cookies, only in memory/database
  }

  // Set current user for face recognition auto-login
  setCurrentUser(userData: {
    id: string
    email: string
    displayName: string
    role: string
    roleCode: string
    restaurantId: string
  }): void {
    // Generate auth token for face login
    const authToken = `face_${userData.id}_${Date.now()}`
    
    // Set all auth cookies
    Cookies.set('authToken', authToken, { expires: 7 })
    Cookies.set('userId', userData.id, { expires: 7 })
    Cookies.set('userEmail', userData.email, { expires: 7 })
    Cookies.set('userName', userData.displayName, { expires: 7 })
    Cookies.set('userRole', userData.role, { expires: 7 })
    Cookies.set('userRoleCode', userData.roleCode, { expires: 7 })
    Cookies.set('restaurantId', userData.restaurantId, { expires: 7 })
  }
}

export const authService = new AuthService()