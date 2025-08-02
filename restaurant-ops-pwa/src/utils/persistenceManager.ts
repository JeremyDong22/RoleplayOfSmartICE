// Persistence manager for saving and loading app state to localStorage
// This ensures data persists across page refreshes but resets at 10:00 AM daily

interface PersistedState {
  completedTaskIds: string[]
  taskStatuses: Array<{ taskId: string; status: string; completedAt?: number; overdue?: boolean }>
  missingTasks: Array<{ id: string; title: string; periodName: string; uploadRequirement?: string | null }>
  manuallyAdvancedPeriod?: string | null // Track manually advanced period
  currentPeriodId?: string | null // Track current period ID for manual transitions
  testTime?: string | null // Store test time for development
  lastSaveDate: string // ISO date string to track when data was saved
}

const STORAGE_KEYS = {
  manager: 'restaurant-ops-manager-state',
  chef: 'restaurant-ops-chef-state'
}

// Save state to localStorage
export const saveState = (role: 'manager' | 'chef', state: Partial<PersistedState>) => {
  try {
    const key = STORAGE_KEYS[role]
    const existingData = loadState(role)
    
    const dataToSave: PersistedState = {
      completedTaskIds: state.completedTaskIds ?? existingData?.completedTaskIds ?? [],
      taskStatuses: state.taskStatuses ?? existingData?.taskStatuses ?? [],
      missingTasks: state.missingTasks ?? existingData?.missingTasks ?? [],
      manuallyAdvancedPeriod: state.manuallyAdvancedPeriod ?? existingData?.manuallyAdvancedPeriod ?? null,
      currentPeriodId: state.currentPeriodId ?? existingData?.currentPeriodId ?? null,
      testTime: state.testTime ?? existingData?.testTime ?? null,
      lastSaveDate: new Date().toISOString()
    }
    
    localStorage.setItem(key, JSON.stringify(dataToSave))
  } catch (error) {
    console.error('Failed to save state to localStorage:', error)
  }
}

// Load state from localStorage
export const loadState = (role: 'manager' | 'chef'): PersistedState | null => {
  try {
    const key = STORAGE_KEYS[role]
    const savedData = localStorage.getItem(key)
    
    if (!savedData) return null
    
    const parsedData = JSON.parse(savedData) as PersistedState
    
    // Check if data is from today or should be reset
    if (shouldResetData(parsedData.lastSaveDate)) {
      clearState(role)
      return null
    }
    
    return parsedData
  } catch (error) {
    console.error('Failed to load state from localStorage:', error)
    return null
  }
}

// Clear all persisted state for a role
export const clearState = (role: 'manager' | 'chef') => {
  try {
    const key = STORAGE_KEYS[role]
    localStorage.removeItem(key)
  } catch (error) {
    console.error('Failed to clear state from localStorage:', error)
  }
}

// Check if we should reset data (crossed 10:00 AM since last save)
const shouldResetData = (lastSaveDateStr: string): boolean => {
  const lastSaveDate = new Date(lastSaveDateStr)
  const now = new Date()
  
  // If last save was before today's 10:00 AM and now is after 10:00 AM
  const todayAt10AM = new Date(now)
  todayAt10AM.setHours(10, 0, 0, 0)
  
  // If last save is before today
  if (lastSaveDate.toDateString() !== now.toDateString()) {
    // If current time is after 10:00 AM, reset
    if (now >= todayAt10AM) {
      return true
    }
  }
  
  // If last save was before 10:00 AM and now is after 10:00 AM on the same day
  if (lastSaveDate < todayAt10AM && now >= todayAt10AM) {
    return true
  }
  
  return false
}

// Utility to check if it's a new day at 10:00 AM
export const isNewDayAt10AM = (lastCheckedTime: Date | null): boolean => {
  if (!lastCheckedTime) return false
  
  const now = new Date()
  const lastCheckedHour = lastCheckedTime.getHours()
  const currentHour = now.getHours()
  
  // Check if we just crossed 10:00 AM
  return lastCheckedHour !== 10 && currentHour === 10
}