// Temporary debug utility to trace 400 errors
// Created: 2025-08-13

import { supabase } from '../services/supabase';

// Intercept Supabase fetch to log 400 errors
const originalFetch = window.fetch;

export function enableSupabaseDebug() {
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    
    // Only intercept Supabase calls
    if (url.includes('supabase.co')) {
      console.log('[DEBUG] Supabase Request:', {
        url,
        method: init?.method || 'GET',
        headers: init?.headers,
        body: init?.body ? JSON.parse(init.body as string) : undefined
      });
      
      try {
        const response = await originalFetch(input, init);
        
        // Log 400 errors with details
        if (response.status === 400) {
          const clonedResponse = response.clone();
          const errorData = await clonedResponse.json().catch(() => ({}));
          
          console.error('[DEBUG] 400 Error Details:', {
            url,
            status: response.status,
            statusText: response.statusText,
            error: errorData,
            method: init?.method || 'GET',
            body: init?.body ? JSON.parse(init.body as string) : undefined
          });
        }
        
        return response;
      } catch (error) {
        console.error('[DEBUG] Fetch Error:', error);
        throw error;
      }
    }
    
    return originalFetch(input, init);
  };
  
  console.log('[DEBUG] Supabase debugging enabled');
}

export function disableSupabaseDebug() {
  window.fetch = originalFetch;
  console.log('[DEBUG] Supabase debugging disabled');
}

// Check current auth session
export async function checkAuthStatus() {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  console.log('[DEBUG] Auth Status:', {
    hasSession: !!session,
    sessionError: error,
    userId: session?.user?.id,
    expiresAt: session?.expires_at
  });
  
  return session;
}

// Test basic queries
export async function testSupabaseQueries() {
  console.log('[DEBUG] Testing Supabase queries...');
  
  // Test 1: Check auth
  await checkAuthStatus();
  
  // Test 2: Try to fetch restaurants (public table)
  const { data: restaurants, error: restaurantsError } = await supabase
    .from('roleplay_restaurants')
    .select('id, name')
    .limit(1);
  
  console.log('[DEBUG] Restaurants query:', {
    success: !restaurantsError,
    error: restaurantsError,
    data: restaurants
  });
  
  // Test 3: Try to fetch user profile (requires auth)
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from('roleplay_users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    console.log('[DEBUG] User profile query:', {
      success: !profileError,
      error: profileError,
      data: profile
    });
  }
}