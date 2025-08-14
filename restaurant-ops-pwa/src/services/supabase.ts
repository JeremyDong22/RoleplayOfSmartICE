// Supabase client configuration for restaurant operations management
// Updated: 2025-01-13 - Added singleton pattern to prevent multiple client instances
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Singleton instance to prevent multiple clients
let supabaseInstance: SupabaseClient<Database> | null = null

// Function to create or get the Supabase client
const createSupabaseClient = (): SupabaseClient<Database> => {
  // Create client without custom fetch - use Supabase's built-in timeout handling
  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      detectSessionInUrl: true,
      flowType: 'pkce'
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    },
    db: {
      schema: 'public'
    },
    // Remove custom fetch to avoid connection issues
    global: {
      headers: {
        'x-client-info': 'restaurant-ops-pwa'
      }
    }
  })
  
  return client
}

// Export function to get current Supabase instance
export const getSupabase = (): SupabaseClient<Database> => {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient()
  }
  return supabaseInstance
}

// For backward compatibility - this will be deprecated
export const supabase = getSupabase()

// Reset function to create a fresh Supabase client
export const resetSupabaseClient = (): SupabaseClient<Database> => {
  // Clear the existing instance
  supabaseInstance = null
  
  // Create and return a fresh instance
  supabaseInstance = createSupabaseClient()
  
  return supabaseInstance
}

// Helper function to upload files to storage
export const uploadFile = async (
  bucket: string,
  path: string,
  file: File
): Promise<{ data: any; error: any }> => {
  const { data, error } = await getSupabase().storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    return { data: null, error }
  }

  // Get public URL
  const { data: { publicUrl } } = getSupabase().storage
    .from(bucket)
    .getPublicUrl(path)

  return { data: { ...data, publicUrl }, error: null }
}

// Helper to get authenticated user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await getSupabase().auth.getUser()
  if (error || !user) return null
  
  // Get user profile with role
  const { data: profile } = await getSupabase()
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()
    
  return profile
}