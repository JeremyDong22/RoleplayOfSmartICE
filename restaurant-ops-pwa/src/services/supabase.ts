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
const getSupabaseClient = (): SupabaseClient<Database> => {
  if (!supabaseInstance) {
    // Add logging to debug Realtime connection
    console.log('[Supabase] Creating new client instance:', {
      url: supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
      realtimeConfig: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
    
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
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
    },
    log_level: 'debug' // Enable debug logging for Realtime
  },
      global: {
        fetch: (url, options = {}) => {
          // Add timeout for all requests (30 seconds for mobile networks)
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 30000);
          
          // Make sure we don't override existing headers, especially the apikey
          return fetch(url, {
            ...options,
            signal: controller.signal
          }).finally(() => clearTimeout(timeout));
        }
      }
    })
    
    // Log when Supabase client is created
    console.log('[Supabase] Client created successfully')
  } else {
    console.log('[Supabase] Using existing client instance')
  }
  
  return supabaseInstance
}

// Export the singleton instance
export const supabase = getSupabaseClient()

// Helper function to upload files to storage
export const uploadFile = async (
  bucket: string,
  path: string,
  file: File
): Promise<{ data: any; error: any }> => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    console.error('Upload error:', error)
    return { data: null, error }
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)

  return { data: { ...data, publicUrl }, error: null }
}

// Helper to get authenticated user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  
  // Get user profile with role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()
    
  return profile
}