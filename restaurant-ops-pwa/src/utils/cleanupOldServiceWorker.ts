/**
 * Cleanup old service worker and caches
 * Updated: 2025-01-24 - Clean up old PWA artifacts after configuration changes
 */

export async function cleanupOldServiceWorker(): Promise<void> {
  try {
    // 1. Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (const registration of registrations) {
        await registration.unregister()
        console.log('Unregistered service worker:', registration.scope)
      }
    }

    // 2. Clear all caches except essential ones
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      const essentialCaches = [
        'face-models-permanent', // Keep face models
        'task-samples-cache'     // Keep task samples
      ]

      for (const cacheName of cacheNames) {
        // Delete non-essential caches
        if (!essentialCaches.includes(cacheName)) {
          await caches.delete(cacheName)
          console.log('Deleted cache:', cacheName)
        }
      }
    }

    // 3. Clear problematic caches that might contain wrong content
    const problematicCaches = [
      'workbox-precache-v2',
      'supabase-cache' // Remove Supabase cache as requested
    ]

    for (const cacheName of problematicCaches) {
      try {
        await caches.delete(cacheName)
        console.log('Deleted problematic cache:', cacheName)
      } catch (e) {
        // Cache might not exist
      }
    }

    console.log('Service worker cleanup completed')
  } catch (error) {
    console.error('Error during service worker cleanup:', error)
  }
}

// Auto-run cleanup on first load after deployment
export function initServiceWorkerCleanup(): void {
  const CLEANUP_VERSION = 'sw-cleanup-v2'
  const lastCleanup = localStorage.getItem('sw-cleanup-version')

  if (lastCleanup !== CLEANUP_VERSION) {
    cleanupOldServiceWorker().then(() => {
      localStorage.setItem('sw-cleanup-version', CLEANUP_VERSION)
      console.log('Completed one-time service worker cleanup')
    })
  }
}