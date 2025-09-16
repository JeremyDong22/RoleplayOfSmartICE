# Duty Manager Duplicate Submission Fix

## Problem Summary
Duty Manager tasks were being submitted twice with different period_ids, creating duplicate records in the database. This caused tasks to appear as both "pending" and "approved" in the UI.

## Root Cause Analysis

### Dual Submission Paths
1. **Primary Path**: `submitTaskWithMedia()` → Uses correct period_id (UUID format like `7aaafb55-79ef-43e5-9944-8c5a1d6a4704_deyang`)
2. **Secondary Path**: `addSubmission()` → Used hardcoded `period_id: 'closing'`

Both paths were executing, creating two records with different period_ids, bypassing duplicate detection.

### Timeline of Duplicates
- First submission: Via `submitTaskWithMedia()` with correct UUID
- Second submission: 3-29 seconds later via `addSubmission()` with 'closing'
- Result: Same task appears twice in database

## Solution Implemented

### Code Changes

#### 1. DutyManagerDashboard.tsx (Line 423)
```typescript
// Before:
await addSubmission(submission)

// After:
// await addSubmission(submission)  // Commented out - submitTaskWithMedia already handles this
```

#### 2. taskRecordService.ts (Lines 44-65)
Added duplicate prevention check before inserting:
```typescript
if (taskData.task_id && taskData.date && taskData.period_id) {
  const { data: existingRecord } = await getSupabase()
    .from('roleplay_task_records')
    .select('id, created_at, status, review_status')
    .eq('task_id', taskData.task_id)
    .eq('user_id', taskData.user_id)
    .eq('date', taskData.date)
    .eq('period_id', taskData.period_id)
    .maybeSingle()

  if (existingRecord) {
    return existingRecord  // Return existing instead of creating duplicate
  }
}
```

#### 3. DutyManagerDashboard.tsx (Lines 399-415)
Fixed UI status display - removed immediate addition to completedTaskIds:
```typescript
// Before:
completedTaskIds: [...prev.completedTaskIds, taskId],

// After:
// Don't add to completedTaskIds - let it stay in pending (orange) status
```

### Database Changes

#### Unique Constraint Added
```sql
ALTER TABLE roleplay_task_records
ADD CONSTRAINT unique_task_submission
UNIQUE (task_id, user_id, date, period_id);
```

#### Historical Data Cleanup
- Deleted 139 records with hardcoded `period_id = 'closing'`
- Cleaned up duplicate duty manager tasks in roleplay_tasks table
- Normalized both restaurants to have 5 duty manager tasks each

## UI Behavior

### Before Fix
- Task submission → Immediately green (completed)
- Duplicate records caused inconsistent status display

### After Fix
- Task submission → Orange (pending review)
- Manager approval → Green (completed)
- Manager rejection → Red (rejected, needs resubmission)

## Prevention Measures

1. **Database Level**: Unique constraint prevents duplicate inserts
2. **Application Level**: Duplicate check before insertion
3. **Code Level**: Removed redundant submission path

## Related Files
- `/src/pages/DutyManagerDashboard.tsx`
- `/src/services/taskRecordService.ts`
- `/src/services/dutyManagerPersistence.ts`
- `/src/utils/taskSubmissionHelper.ts`

## Testing Notes
- Verify duty manager can submit tasks once
- Confirm tasks show orange (pending) status after submission
- Check manager can approve/reject properly
- Ensure no duplicates created even with network retries

// Updated: 2025-01-17 - Initial documentation of duplicate submission fix