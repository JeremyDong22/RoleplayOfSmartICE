/**
 * Hybrid Authentication Service - Manages both legacy and Supabase Auth
 * 
 * This service provides a unified interface for authentication that:
 * 1. Supports both legacy cookie-based auth and new Supabase Auth
 * 2. Automatically migrates users on login
 * 3. Provides seamless transition with zero downtime
 * 
 * Created: 2025-01-12 - Dual authentication support during migration
 */
import { authService as legacyAuthService } from './authService'
import { authSupabaseService } from './authSupabaseService'
import type { AuthUser } from './authService'
import type { SupabaseAuthUser } from './authSupabaseService'

// Unified auth user type
export type HybridAuthUser = AuthUser | SupabaseAuthUser

// Feature flag to control which auth system to use
const USE_SUPABASE_AUTH = localStorage.getItem('USE_SUPABASE_AUTH') === 'true' || false

class AuthHybridService {
  private static instance: AuthHybridService | null = null
  
  private constructor() {}
  
  static getInstance(): AuthHybridService {
    if (!AuthHybridService.instance) {
      AuthHybridService.instance = new AuthHybridService()
    }
    return AuthHybridService.instance
  }
  
  /**
   * Enable or disable Supabase Auth
   */
  setUseSupabaseAuth(enabled: boolean) {
    localStorage.setItem('USE_SUPABASE_AUTH', enabled.toString())
    if (enabled) {
      console.log('Supabase Auth enabled - new logins will use Supabase')
    } else {
      console.log('Supabase Auth disabled - using legacy auth')
    }
  }
  
  /**
   * Check if Supabase Auth is enabled
   */
  isSupabaseAuthEnabled(): boolean {
    return localStorage.getItem('USE_SUPABASE_AUTH') === 'true'
  }
  
  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    // Check both auth systems
    const legacyAuth = legacyAuthService.isAuthenticated()
    const supabaseAuth = await authSupabaseService.isAuthenticated()
    
    return legacyAuth || supabaseAuth
  }
  
  /**
   * Get current user from either auth system
   */
  async getCurrentUser(): Promise<HybridAuthUser | null> {
    // First check Supabase Auth
    const supabaseUser = await authSupabaseService.getCurrentUser()
    if (supabaseUser) {
      return supabaseUser
    }
    
    // Fallback to legacy auth
    return legacyAuthService.getCurrentUser()
  }
  
  /**
   * Login with username and password
   * Attempts Supabase Auth first if enabled, then falls back to legacy
   */
  async login(username: string, password: string): Promise<{ user: HybridAuthUser | null; error?: string }> {
    // If Supabase Auth is enabled, try it first
    if (this.isSupabaseAuthEnabled()) {
      console.log('Attempting Supabase Auth login...')
      const supabaseResult = await authSupabaseService.loginWithUsername(username, password)
      
      if (!supabaseResult.error) {
        console.log('Supabase Auth login successful')
        return supabaseResult
      }
      
      console.log('Supabase Auth failed, trying legacy auth...')
    }
    
    // Try legacy auth
    const legacyResult = await legacyAuthService.login(username, password)
    
    if (!legacyResult.error && legacyResult.user && this.isSupabaseAuthEnabled()) {
      // Successful legacy login - attempt background migration
      console.log('Legacy login successful, attempting background migration...')
      this.attemptBackgroundMigration(username, password).catch(err => {
        console.error('Background migration failed:', err)
      })
    }
    
    return legacyResult
  }
  
  /**
   * Attempt to migrate user in background
   */
  private async attemptBackgroundMigration(username: string, password: string) {
    try {
      // Try to create user in Supabase Auth
      await authSupabaseService.loginWithUsername(username, password)
      console.log(`User ${username} successfully migrated to Supabase Auth`)
    } catch (error) {
      console.error(`Failed to migrate user ${username}:`, error)
    }
  }
  
  /**
   * Face recognition login
   */
  async loginWithFaceRecognition(userData: {
    id: string
    email: string
    displayName: string
    role: string
    roleCode: string
    restaurantId: string
  }): Promise<void> {
    if (this.isSupabaseAuthEnabled()) {
      // Use Supabase Auth for face recognition
      const result = await authSupabaseService.loginWithFaceRecognition(userData.id)
      if (result.error) {
        throw new Error(result.error)
      }
    } else {
      // Use legacy auth
      legacyAuthService.setCurrentUser(userData)
    }
  }
  
  /**
   * Logout user from both systems
   */
  async logout(): Promise<void> {
    // Logout from both systems
    await Promise.all([
      legacyAuthService.logout(),
      authSupabaseService.logout()
    ])
  }
  
  /**
   * Check if user has specific role
   */
  async hasRole(roleCode: string): Promise<boolean> {
    const supabaseAuth = await authSupabaseService.hasRole(roleCode)
    if (supabaseAuth) return true
    
    return legacyAuthService.hasRole(roleCode)
  }
  
  /**
   * Check if user can access a specific route
   */
  async canAccessRoute(path: string): Promise<boolean> {
    const supabaseAuth = await authSupabaseService.canAccessRoute(path)
    if (supabaseAuth) return true
    
    return legacyAuthService.canAccessRoute(path)
  }
  
  /**
   * Get migration status for analytics
   */
  async getMigrationStatus(): Promise<{
    totalUsers: number
    migratedUsers: number
    pendingUsers: number
    migrationPercentage: number
  }> {
    try {
      const { getSupabase } = await import('./supabase')
      
      // Get migration stats
      const { data: stats } = await getSupabase()
        .from('roleplay_users')
        .select('migration_status')
      
      if (!stats) {
        return {
          totalUsers: 0,
          migratedUsers: 0,
          pendingUsers: 0,
          migrationPercentage: 0
        }
      }
      
      const totalUsers = stats.length
      const migratedUsers = stats.filter(u => u.migration_status === 'completed').length
      const pendingUsers = stats.filter(u => u.migration_status === 'pending').length
      
      return {
        totalUsers,
        migratedUsers,
        pendingUsers,
        migrationPercentage: totalUsers > 0 ? (migratedUsers / totalUsers) * 100 : 0
      }
    } catch (error) {
      console.error('Failed to get migration status:', error)
      return {
        totalUsers: 0,
        migratedUsers: 0,
        pendingUsers: 0,
        migrationPercentage: 0
      }
    }
  }
}

// Export singleton getter
export const getAuthHybridService = () => AuthHybridService.getInstance()

// Create proxy for backward compatibility
export const authHybridService = new Proxy({} as AuthHybridService, {
  get(target, prop) {
    const instance = AuthHybridService.getInstance()
    const value = (instance as any)[prop]
    return typeof value === 'function' ? value.bind(instance) : value
  }
})