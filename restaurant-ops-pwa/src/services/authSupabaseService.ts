/**
 * Supabase Auth Service - New authentication using Supabase Auth
 * 
 * This service manages user authentication using Supabase Auth:
 * 1. JWT-based session management (replacing cookies)
 * 2. Integration with auth.users table (Supabase native)
 * 3. Links to roleplay_users table via auth_user_id
 * 4. Support for password login and face recognition
 * 
 * Created: 2025-01-12 - Migration to Supabase Auth
 */
import { getSupabase } from './supabase'
import { Session, User } from '@supabase/supabase-js'

export interface SupabaseAuthUser {
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

interface RoleplayUser {
  id: string
  username: string
  email: string
  full_name: string
  role_id: string
  restaurant_id: string
  auth_user_id: string | null
  migration_status: string
  roleplay_roles: {
    role_code: string
    role_name_zh: string
    role_name_en: string
  }
}

class AuthSupabaseService {
  private static instance: AuthSupabaseService | null = null
  private currentSession: Session | null = null
  
  private constructor() {
    // Initialize auth state listener
    this.initializeAuthListener()
  }
  
  static getInstance(): AuthSupabaseService {
    if (!AuthSupabaseService.instance) {
      AuthSupabaseService.instance = new AuthSupabaseService()
    }
    return AuthSupabaseService.instance
  }
  
  /**
   * Initialize auth state change listener
   */
  private initializeAuthListener() {
    getSupabase().auth.onAuthStateChange((event, session) => {
      this.currentSession = session
      
      // Handle auth events
      if (event === 'SIGNED_IN') {
        console.log('User signed in:', session?.user?.email)
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out')
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed')
      }
    })
  }
  
  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const { data: { session } } = await getSupabase().auth.getSession()
    return !!session
  }
  
  /**
   * Get current session
   */
  async getSession(): Promise<Session | null> {
    const { data: { session } } = await getSupabase().auth.getSession()
    return session
  }
  
  /**
   * Get current user with roleplay data
   */
  async getCurrentUser(): Promise<SupabaseAuthUser | null> {
    const { data: { user } } = await getSupabase().auth.getUser()
    if (!user) return null
    
    // Get roleplay user data
    const { data: roleplayUser, error } = await getSupabase()
      .from('roleplay_users')
      .select(`
        *,
        roleplay_roles (
          role_code,
          role_name_zh,
          role_name_en
        )
      `)
      .eq('auth_user_id', user.id)
      .single()
    
    if (error || !roleplayUser) {
      console.error('Failed to get roleplay user:', error)
      return null
    }
    
    const roleData = Array.isArray(roleplayUser.roleplay_roles) 
      ? roleplayUser.roleplay_roles[0] 
      : roleplayUser.roleplay_roles
    
    return {
      id: user.id,
      email: user.email || '',
      name: roleplayUser.full_name,
      display_name: roleplayUser.full_name,
      role: roleData?.role_name_zh || '',
      role_name: roleData?.role_name_zh || '',
      roleCode: roleData?.role_code || '',
      restaurantId: roleplayUser.restaurant_id,
      face_descriptor: roleplayUser.face_descriptor
    }
  }
  
  /**
   * Login with email and password (Supabase Auth)
   */
  async loginWithSupabase(email: string, password: string): Promise<{ user: SupabaseAuthUser | null; error?: string }> {
    try {
      // Sign in with Supabase Auth
      const { data, error } = await getSupabase().auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        return { user: null, error: error.message }
      }
      
      // Get user data
      const user = await this.getCurrentUser()
      if (!user) {
        return { user: null, error: 'Failed to get user data' }
      }
      
      return { user }
    } catch (error: any) {
      return { user: null, error: error.message || 'Login failed' }
    }
  }
  
  /**
   * Login with username - attempts migration if needed
   */
  async loginWithUsername(username: string, password: string): Promise<{ user: SupabaseAuthUser | null; error?: string }> {
    try {
      // First, get the user's email from roleplay_users
      const { data: roleplayUser, error: roleplayError } = await getSupabase()
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
      
      if (roleplayError || !roleplayUser) {
        return { user: null, error: '用户名或密码错误' }
      }
      
      // Check if user has been migrated
      if (roleplayUser.auth_user_id && roleplayUser.migration_status === 'completed') {
        // User already migrated, use Supabase Auth
        return this.loginWithSupabase(roleplayUser.email, password)
      }
      
      // User not migrated, attempt migration
      const migrationResult = await this.migrateUser(roleplayUser as RoleplayUser, password)
      if (migrationResult.error) {
        return { user: null, error: migrationResult.error }
      }
      
      // After successful migration, login with Supabase Auth
      return this.loginWithSupabase(roleplayUser.email, password)
    } catch (error: any) {
      return { user: null, error: error.message || 'Login failed' }
    }
  }
  
  /**
   * Migrate a user from legacy auth to Supabase Auth
   */
  private async migrateUser(roleplayUser: RoleplayUser, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify legacy password (demo pattern for now)
      const expectedPassword = `${roleplayUser.username}123`
      if (password !== expectedPassword) {
        return { success: false, error: '用户名或密码错误' }
      }
      
      // Create user in Supabase Auth
      const { data: authUser, error: createError } = await getSupabase().auth.admin.createUser({
        email: roleplayUser.email,
        password: password, // Use the same password for now
        email_confirm: true, // Auto-confirm email since it's a migration
        user_metadata: {
          full_name: roleplayUser.full_name,
          username: roleplayUser.username
        },
        app_metadata: {
          role_id: roleplayUser.role_id,
          restaurant_id: roleplayUser.restaurant_id,
          legacy_user_id: roleplayUser.id
        }
      })
      
      if (createError) {
        // Handle case where user might already exist
        if (createError.message.includes('already registered')) {
          // User exists, just update the roleplay_users table
          const { data: { user } } = await getSupabase().auth.admin.getUserByEmail(roleplayUser.email)
          if (user) {
            await this.updateRoleplayUserAuthId(roleplayUser.id, user.id)
            return { success: true }
          }
        }
        return { success: false, error: createError.message }
      }
      
      // Update roleplay_users with auth_user_id
      await this.updateRoleplayUserAuthId(roleplayUser.id, authUser.user.id)
      
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message || 'Migration failed' }
    }
  }
  
  /**
   * Update roleplay_users with Supabase auth_user_id
   */
  private async updateRoleplayUserAuthId(roleplayUserId: string, authUserId: string) {
    await getSupabase()
      .from('roleplay_users')
      .update({
        auth_user_id: authUserId,
        migration_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', roleplayUserId)
  }
  
  /**
   * Face recognition login - creates session via Admin API
   */
  async loginWithFaceRecognition(roleplayUserId: string): Promise<{ user: SupabaseAuthUser | null; error?: string }> {
    try {
      // Get roleplay user
      const { data: roleplayUser, error: roleplayError } = await getSupabase()
        .from('roleplay_users')
        .select(`
          *,
          roleplay_roles (
            role_code,
            role_name_zh,
            role_name_en
          )
        `)
        .eq('id', roleplayUserId)
        .single()
      
      if (roleplayError || !roleplayUser) {
        return { user: null, error: 'User not found' }
      }
      
      // Check if user has been migrated
      if (!roleplayUser.auth_user_id) {
        // Create user in Supabase Auth first
        const migrationResult = await this.migrateUserForFaceAuth(roleplayUser as RoleplayUser)
        if (migrationResult.error) {
          return { user: null, error: migrationResult.error }
        }
        roleplayUser.auth_user_id = migrationResult.authUserId
      }
      
      // Sign in the user using admin API (creates a session without password)
      const { data, error } = await getSupabase().auth.admin.generateLink({
        type: 'magiclink',
        email: roleplayUser.email,
        options: {
          redirectTo: window.location.origin
        }
      })
      
      if (error) {
        return { user: null, error: error.message }
      }
      
      // Extract token from the link and verify it
      const url = new URL(data.properties.action_link)
      const token = url.searchParams.get('token')
      
      if (token) {
        const { data: session, error: verifyError } = await getSupabase().auth.verifyOtp({
          token_hash: token,
          type: 'magiclink'
        })
        
        if (!verifyError && session) {
          const user = await this.getCurrentUser()
          return { user, error: undefined }
        }
      }
      
      return { user: null, error: 'Failed to create session' }
    } catch (error: any) {
      return { user: null, error: error.message || 'Face login failed' }
    }
  }
  
  /**
   * Migrate user for face authentication
   */
  private async migrateUserForFaceAuth(roleplayUser: RoleplayUser): Promise<{ authUserId?: string; error?: string }> {
    try {
      // Generate a secure random password for face auth users
      const randomPassword = this.generateSecurePassword()
      
      // Create user in Supabase Auth
      const { data: authUser, error: createError } = await getSupabase().auth.admin.createUser({
        email: roleplayUser.email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          full_name: roleplayUser.full_name,
          username: roleplayUser.username,
          auth_method: 'face_recognition'
        },
        app_metadata: {
          role_id: roleplayUser.role_id,
          restaurant_id: roleplayUser.restaurant_id,
          legacy_user_id: roleplayUser.id
        }
      })
      
      if (createError) {
        if (createError.message.includes('already registered')) {
          const { data: { user } } = await getSupabase().auth.admin.getUserByEmail(roleplayUser.email)
          if (user) {
            await this.updateRoleplayUserAuthId(roleplayUser.id, user.id)
            return { authUserId: user.id }
          }
        }
        return { error: createError.message }
      }
      
      // Update roleplay_users
      await this.updateRoleplayUserAuthId(roleplayUser.id, authUser.user.id)
      
      return { authUserId: authUser.user.id }
    } catch (error: any) {
      return { error: error.message || 'Migration failed' }
    }
  }
  
  /**
   * Generate secure random password
   */
  private generateSecurePassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < 20; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }
  
  /**
   * Logout user
   */
  async logout(): Promise<void> {
    await getSupabase().auth.signOut()
    this.currentSession = null
  }
  
  /**
   * Check if user has specific role
   */
  async hasRole(roleCode: string): Promise<boolean> {
    const user = await this.getCurrentUser()
    return user?.roleCode === roleCode
  }
  
  /**
   * Check if user can access a specific route
   */
  async canAccessRoute(path: string): Promise<boolean> {
    const user = await this.getCurrentUser()
    if (!user) return false
    
    // Administrator can access all routes
    if (user.roleCode === 'administrator') {
      return true
    }
    
    // Map routes to allowed roles
    const routePermissions: Record<string, string[]> = {
      '/manager': ['manager'],
      '/chef': ['chef'],
      '/duty-manager': ['duty_manager', 'manager'],
      '/ceo': ['ceo']
    }
    
    const allowedRoles = routePermissions[path]
    if (!allowedRoles) return true
    
    return allowedRoles.includes(user.roleCode)
  }
  
  /**
   * Refresh session token
   */
  async refreshSession(): Promise<Session | null> {
    const { data: { session }, error } = await getSupabase().auth.refreshSession()
    if (error) {
      console.error('Failed to refresh session:', error)
      return null
    }
    return session
  }
}

// Export singleton getter
export const getAuthSupabaseService = () => AuthSupabaseService.getInstance()

// Create proxy for backward compatibility
export const authSupabaseService = new Proxy({} as AuthSupabaseService, {
  get(target, prop) {
    const instance = AuthSupabaseService.getInstance()
    const value = (instance as any)[prop]
    return typeof value === 'function' ? value.bind(instance) : value
  }
})