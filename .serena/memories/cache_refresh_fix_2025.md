# Cache Refresh Double-Load Fix (2025-01-13)

## Problem
After clearing browser cache, the task interface would show "当前时段没有任务" (no tasks for current period) on first load. Users had to refresh the page a second time to see the correct tasks.

## Root Cause
Race condition between TaskDataProvider initialization and Dashboard component rendering:
- TaskService had a 100ms delay during initialization
- Dashboard's period update effect was running before workflowPeriods were loaded
- This caused the period calculation to fail with empty data

## Solution Implemented

### 1. Fixed Period Update Effects
**Files**: `ManagerDashboard-new.tsx`, `ChefDashboard-new.tsx`
```typescript
// Added guard to prevent running with empty data
useEffect(() => {
  // Don't run period updates until workflowPeriods are loaded
  if (!workflowPeriods || workflowPeriods.length === 0) {
    return
  }
  // ... rest of period update logic
}, [testTime, isManualClosing, isWaitingForNextDay, workflowPeriods, dbState])
```

### 2. Enhanced Loading State Checks
**Files**: `ManagerDashboard-new.tsx`, `ChefDashboard-new.tsx`
```typescript
// Check workflowPeriods in loading condition
if (isLoading || isLoadingFromDb || !workflowPeriods || workflowPeriods.length === 0) {
  return <LoadingScreen />
}
```

### 3. Removed Unnecessary Delays
**File**: `taskService.ts`
- Removed 100ms initialization delay
- Reduced retry delays from 1000ms to 200ms increments
- Reduced realtime subscription delay from 2000ms to 500ms

## Testing
To test if the fix works:
1. Clear all browser data (cache, localStorage, cookies)
2. Navigate to the task interface
3. Should see tasks immediately without needing a second refresh

## Related Components
- TaskDataProvider: Manages task data loading from Supabase
- taskService: Singleton service for task data management
- Period update effects: Calculate current period based on time and data
- Service Worker: Uses NetworkFirst strategy for Supabase API calls

## Important Notes
- The fix ensures data dependencies are properly handled
- Loading states now accurately reflect data availability
- Performance improved by removing unnecessary delays