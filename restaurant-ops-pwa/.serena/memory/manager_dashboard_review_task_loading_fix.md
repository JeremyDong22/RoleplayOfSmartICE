# Manager Dashboard Review Task Loading Fix

## Problem Summary
Manager's dashboard was not showing approved duty manager tasks as completed. Even though duty manager tasks were marked as "approved" in the database, the corresponding review tasks on the Manager's dashboard still showed as "等待提交" (waiting for submission).

## Root Cause Analysis

### State Timing Issue
The `loadApprovedDutyManagerTasks()` function was failing during initial page load because:

1. **Asynchronous State Update**: `setCurrentUserId(currentUser.id)` was called to update state
2. **Immediate Function Call**: `loadApprovedDutyManagerTasks()` was called right after
3. **State Not Ready**: The function relied on `currentUserId` from component state, which hadn't updated yet
4. **Early Exit**: Function returned empty array due to missing `currentUserId`

### Console Evidence
```javascript
[loadApprovedDutyManagerTasks] Missing restaurantId or currentUserId
[loadFromDatabase] Initial load - Final completed IDs: (16) [...] // No review task IDs added
```

## Solution Implemented

### Code Changes

#### 1. Created New Function with Direct Parameter (ManagerDashboard-new.tsx)
```typescript
// New function that accepts userId directly
const loadApprovedDutyManagerTasksWithUserId = async (userId: string) => {
  const restaurantId = await getRestaurantId()

  if (!restaurantId || !userId) {
    console.log('[loadApprovedDutyManagerTasksWithUserId] Missing restaurantId or userId')
    return []
  }

  // ... rest of the logic
}
```

#### 2. Updated Initial Load (Lines ~356)
```typescript
// Before:
const reviewTasksToAdd = await loadApprovedDutyManagerTasks()

// After:
const reviewTasksToAdd = await loadApprovedDutyManagerTasksWithUserId(currentUser.id)
```

#### 3. Updated Refresh Handler (Lines 213-214)
Added the same fix to the `handleRefresh` function to ensure review tasks are loaded during manual refresh:
```typescript
const reviewTasksToAdd = await loadApprovedDutyManagerTasks()
setCompletedTaskIds([...completedIds, ...reviewTasksToAdd])
```

## How Review Tasks Work

### Task ID Mapping
- Duty manager tasks have IDs like: `abc123_deyang`
- Review tasks generated with IDs: `review-abc123_deyang`
- Manager dashboard dynamically generates review tasks for duty manager tasks

### Completion Logic
1. Duty manager submits task → Status: "pending"
2. Manager approves task → Duty manager task status: "approved"
3. System detects approved duty manager task → Marks corresponding review task as completed
4. UI shows review task with green checkmark

## Related Files
- `/src/pages/ManagerDashboard-new.tsx`
- `/src/services/taskRecordService.ts` (getTodayApprovedDutyManagerTasks function)

## Testing Notes
- Verify review tasks show as completed when duty manager tasks are approved
- Check both initial page load and manual refresh
- Confirm console logs show approved duty tasks being loaded
- Ensure completedTaskIds includes review task IDs

## Prevention Measures
- Always pass required parameters directly during initialization instead of relying on state
- Be aware of React's asynchronous state updates
- Add console logging to debug state-dependent functions

// Created: 2025-09-17 - Initial documentation of review task loading fix