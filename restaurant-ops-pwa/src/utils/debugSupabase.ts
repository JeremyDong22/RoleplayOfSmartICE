// Debug utility for authentication and database queries
// Created: 2025-08-13
// Updated: 2025-08-14 - Added Cookie auth debugging, removed misleading Supabase Auth checks

import { supabase } from '../services/supabase';
import { authService } from '../services/authService';

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

/**
 * Check Cookie-based authentication status
 * This shows the REAL user authentication status from our custom auth system
 */
export function checkCookieAuthStatus() {
  const user = authService.getCurrentUser();
  
  console.log('[DEBUG] Cookie Auth Status:', {
    isLoggedIn: !!user,
    userId: user?.id || 'Not logged in',
    userName: user?.name || 'N/A',
    userEmail: user?.email || 'N/A',
    userRole: user?.roleCode || 'N/A',
    restaurantId: user?.restaurantId || 'N/A'
  });
  
  return user;
}

// Test basic queries and authentication
export async function testSupabaseQueries() {
  // Only log in development and if explicitly debugging
  if (!import.meta.env.DEV) return;
  
  console.log('[DEBUG] Testing authentication and database connection...');
  
  // Check REAL auth status from Cookie
  checkCookieAuthStatus();
  
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
  
  // Test 3: Try to fetch user profile using Cookie auth (NOT Supabase Auth)
  const currentUser = authService.getCurrentUser();
  if (currentUser && currentUser.id) {
    const { data: profile, error: profileError } = await supabase
      .from('roleplay_users')
      .select('*')
      .eq('id', currentUser.id)
      .single();
    
    console.log('[DEBUG] User profile query:', {
      success: !profileError,
      error: profileError,
      data: profile
    });
    
    // Final summary with real user info
    console.log(`[DEBUG] ✅ System ready - User: ${currentUser.name} (${currentUser.roleCode}) logged in`);
  } else {
    console.log('[DEBUG] ⚠️ No user logged in via Cookie - Please login first');
  }
}