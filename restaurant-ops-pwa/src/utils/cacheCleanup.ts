/**
 * Cache Cleanup Utility
 * Version: 1.0.0
 * Created: 2025-01-13
 * Purpose: Shared utility for complete cache and storage cleanup
 * Used by both UpdateNotification and GlobalRefreshButton for consistent update behavior
 */

/**
 * Performs a complete cleanup of all browser storage and caches
 * This ensures a fresh start with no stale data
 * @returns Promise that resolves when cleanup is complete
 */
export async function performCompleteCleanup(): Promise<void> {
  console.log('Performing complete cache and storage cleanup...')

  // 1. Clear localStorage completely (auth is in cookies, not localStorage)
  localStorage.clear()
  console.log('✓ localStorage cleared')

  // 2. Clear sessionStorage
  sessionStorage.clear()
  console.log('✓ sessionStorage cleared')

  // 3. Clear IndexedDB
  if ('indexedDB' in window) {
    try {
      const databases = await indexedDB.databases?.() || []
      for (const db of databases) {
        if (db.name) {
          try {
            await indexedDB.deleteDatabase(db.name)
            console.log(`✓ Deleted IndexedDB: ${db.name}`)
          } catch (err) {
            console.error(`Failed to delete IndexedDB ${db.name}:`, err)
          }
        }
      }
    } catch (err) {
      console.error('Failed to enumerate IndexedDB databases:', err)
    }
  }

  // 4. Clear all cookies
  document.cookie.split(";").forEach((c) => {
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
  })
  console.log('✓ Cookies cleared')

  // 5. Clear all cache storage
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map(cacheName => {
          console.log(`✓ Deleting cache: ${cacheName}`)
          return caches.delete(cacheName)
        })
      )
    } catch (err) {
      console.error('Failed to clear caches:', err)
    }
  }

  // 6. Unregister all service workers
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (const registration of registrations) {
        await registration.unregister()
        console.log('✓ Unregistered service worker')
      }
    } catch (err) {
      console.error('Failed to unregister service workers:', err)
    }
  }

  console.log('Complete cleanup finished!')
}

/**
 * Performs cleanup and then reloads the page
 * @param delay - Delay in milliseconds before reload (default: 1500)
 */
export async function cleanupAndReload(delay: number = 1500): Promise<void> {
  await performCompleteCleanup()

  // Wait briefly to ensure all cleanup operations complete
  setTimeout(() => {
    // Navigate to root and force reload
    window.location.href = '/'
    window.location.reload()
  }, delay)
}