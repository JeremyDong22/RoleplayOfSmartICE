// Global test time management for cross-role testing
// This allows all roles to share the same test time, making it easier to test interactions between roles

const GLOBAL_TEST_TIME_KEY = 'restaurant-ops-global-test-time'
const TEST_TIME_ENABLED_KEY = 'restaurant-ops-test-time-enabled'

interface GlobalTestTimeData {
  enabled: boolean
  offset: number // milliseconds offset from real time
  lastUpdated: number
}

// Get current global test time state
export function getGlobalTestTime(): GlobalTestTimeData | null {
  try {
    const data = localStorage.getItem(GLOBAL_TEST_TIME_KEY)
    if (!data) return null
    
    const parsed = JSON.parse(data) as GlobalTestTimeData
    
    // Check if data is older than 1 hour - if so, consider it stale
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    if (parsed.lastUpdated < oneHourAgo) {
      clearGlobalTestTime()
      return null
    }
    
    return parsed
  } catch {
    return null
  }
}

// Set global test time
export function setGlobalTestTime(offset: number) {
  const data: GlobalTestTimeData = {
    enabled: true,
    offset,
    lastUpdated: Date.now()
  }
  localStorage.setItem(GLOBAL_TEST_TIME_KEY, JSON.stringify(data))
  localStorage.setItem(TEST_TIME_ENABLED_KEY, 'true')
  
  // Dispatch custom event to notify all tabs/windows
  window.dispatchEvent(new CustomEvent('globalTestTimeChanged', { detail: data }))
}

// Clear global test time
export function clearGlobalTestTime() {
  localStorage.removeItem(GLOBAL_TEST_TIME_KEY)
  localStorage.removeItem(TEST_TIME_ENABLED_KEY)
  
  // Dispatch custom event to notify all tabs/windows
  window.dispatchEvent(new CustomEvent('globalTestTimeChanged', { detail: null }))
}

// Calculate current time based on global test time settings
export function getCurrentTestTime(): Date | undefined {
  const testTimeData = getGlobalTestTime()
  if (!testTimeData || !testTimeData.enabled) {
    return undefined
  }
  
  // Return current time with offset applied
  return new Date(Date.now() + testTimeData.offset)
}

// Hook to subscribe to global test time changes
export function useGlobalTestTime(callback: (testTime: Date | undefined) => void) {
  const handleChange = (event: Event) => {
    const customEvent = event as CustomEvent<GlobalTestTimeData | null>
    if (customEvent.detail && customEvent.detail.enabled) {
      callback(new Date(Date.now() + customEvent.detail.offset))
    } else {
      callback(undefined)
    }
  }
  
  // Listen for changes from other tabs/windows
  window.addEventListener('globalTestTimeChanged', handleChange)
  
  // Also listen for storage changes from other tabs
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === GLOBAL_TEST_TIME_KEY) {
      const testTime = getCurrentTestTime()
      callback(testTime)
    }
  }
  
  window.addEventListener('storage', handleStorageChange)
  
  return () => {
    window.removeEventListener('globalTestTimeChanged', handleChange)
    window.removeEventListener('storage', handleStorageChange)
  }
}