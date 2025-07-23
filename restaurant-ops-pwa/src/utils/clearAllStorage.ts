// Utility function to clear all app-related storage across all pages
// This function clears localStorage, sessionStorage, and IndexedDB for the restaurant ops app

export const clearAllAppStorage = () => {
  // List of all localStorage keys used by the app
  const localStorageKeys = [
    // Manager state
    'restaurant-ops-manager-state',
    'restaurant-ops-manager-state-timestamp',
    
    // Chef state
    'restaurant-ops-chef-state',
    'restaurant-ops-chef-state-timestamp',
    
    // CEO state
    'restaurant-ops-ceo-state',
    'restaurant-ops-ceo-state-timestamp',
    
    // Duty Manager related
    'dutyManagerTrigger',
    'dutyManagerSubmissions',
    'dutyManagerReviewStatus',
    
    // Global test time
    'restaurant-ops-global-test-time',
    
    // Auth related
    'auth_token',
    'user_role',
    'user_info',
    
    // Other app states
    'restaurant-ops-simple-dashboard-state',
    'restaurant-ops-simple-dashboard-state-timestamp',
  ]
  
  // Clear specific localStorage keys
  localStorageKeys.forEach(key => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      // console.error(`Failed to remove localStorage key ${key}:`, error)
    }
  })
  
  // Also clear any broadcast-related keys
  const allKeys = Object.keys(localStorage)
  allKeys.forEach(key => {
    if (key.startsWith('broadcast_') || key.startsWith('restaurant-ops-')) {
      try {
        localStorage.removeItem(key)
      } catch (error) {
        // console.error(`Failed to remove localStorage key ${key}:`, error)
      }
    }
  })
  
  // Clear sessionStorage
  try {
    sessionStorage.clear()
  } catch (error) {
    // console.error('Failed to clear sessionStorage:', error)
  }
  
  // Clear IndexedDB databases used by the app
  const indexedDBDatabases = [
    'restaurant-ops-db',
    'supabase-auth-db',
  ]
  
  indexedDBDatabases.forEach(dbName => {
    try {
      indexedDB.deleteDatabase(dbName)
    } catch (error) {
      // console.error(`Failed to delete IndexedDB database ${dbName}:`, error)
    }
  })
  
  // console.log('All app storage has been cleared')
}

// Function to clear storage and reload the page
export const clearAllStorageAndReload = () => {
  clearAllAppStorage()
  // Small delay to ensure storage operations complete
  setTimeout(() => {
    window.location.reload()
  }, 100)
}