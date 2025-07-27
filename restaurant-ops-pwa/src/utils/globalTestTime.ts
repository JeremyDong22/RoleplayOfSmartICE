// Global test time management for cross-role testing
// This allows all roles to share the same test time, making it easier to test interactions between roles
// Enhanced with BroadcastChannel for better cross-tab synchronization in production

const GLOBAL_TEST_TIME_KEY = 'restaurant-ops-global-test-time'
const TEST_TIME_ENABLED_KEY = 'restaurant-ops-test-time-enabled'
const BROADCAST_CHANNEL_NAME = 'restaurant-ops-time-sync'

interface GlobalTestTimeData {
  enabled: boolean
  offset: number // milliseconds offset from real time
  lastUpdated: number
}

// Create broadcast channel for cross-tab communication
let broadcastChannel: BroadcastChannel | null = null
try {
  if (typeof BroadcastChannel !== 'undefined') {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
  }
} catch (e) {
  console.log('BroadcastChannel not supported, falling back to storage events')
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
  
  // Also broadcast via BroadcastChannel for better cross-tab support
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'timeChanged', data })
  }
  
  // Force a storage event by changing a dummy key (workaround for same-origin limitation)
  localStorage.setItem('restaurant-ops-time-sync-trigger', Date.now().toString())
}

// Clear global test time
export function clearGlobalTestTime() {
  localStorage.removeItem(GLOBAL_TEST_TIME_KEY)
  localStorage.removeItem(TEST_TIME_ENABLED_KEY)
  
  // Dispatch custom event to notify all tabs/windows
  window.dispatchEvent(new CustomEvent('globalTestTimeChanged', { detail: null }))
  
  // Also broadcast via BroadcastChannel
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'timeCleared' })
  }
  
  // Force a storage event
  localStorage.setItem('restaurant-ops-time-sync-trigger', Date.now().toString())
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
    if (e.key === GLOBAL_TEST_TIME_KEY || e.key === 'restaurant-ops-time-sync-trigger') {
      const testTime = getCurrentTestTime()
      callback(testTime)
    }
  }
  
  window.addEventListener('storage', handleStorageChange)
  
  // Listen for BroadcastChannel messages
  const handleBroadcast = (event: MessageEvent) => {
    if (event.data.type === 'timeChanged' && event.data.data) {
      callback(new Date(Date.now() + event.data.data.offset))
    } else if (event.data.type === 'timeCleared') {
      callback(undefined)
    }
  }
  
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast)
  }
  
  return () => {
    window.removeEventListener('globalTestTimeChanged', handleChange)
    window.removeEventListener('storage', handleStorageChange)
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast)
    }
  }
}