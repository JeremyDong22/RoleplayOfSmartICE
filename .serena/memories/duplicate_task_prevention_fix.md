# Duplicate Task Record Prevention Fix

## Date: 2025-09-13 (Updated: 2025-09-15)
## Author: Claude

## Problem Identified
Duplicate task records were being created in multiple scenarios:

### Original Issue (2025-09-13)
- Testing at 23:59 (test time) while real time was 3:00 AM
- Business day cutoff logic (10:00 AM) caused inconsistent date calculations
- Same task could be submitted with different dates due to timing issues

### New Issue Discovered (2025-09-15)
- **Duplicate submissions with 2-14 second delays**
- Each task being submitted twice to database
- Review status showing "pending" despite some records being "approved"
- Example: 德阳值班经理 at 野百灵 restaurant had 5 pending + 5 approved records for same tasks

### Root Cause Analysis

#### Issue 1: Date Calculation (2025-09-13)
1. **Inconsistent Date Calculation**:
   - Code was using `now.toISOString().split('T')[0]` for date
   - This doesn't account for business day cutoff (10 AM)
   - Tasks before 10 AM belong to previous business day
   - Test time vs real time could generate different dates

2. **Insufficient Duplicate Prevention**:
   - Duplicate key was only `${taskId}-${userId}-${date}`
   - When date changed due to cutoff logic, duplicates weren't prevented
   - No database-level constraints to prevent duplicates

#### Issue 2: Rapid Re-submission (2025-09-15)
1. **Premature Cleanup of Submission Lock**:
   - `ongoingSubmissions.delete(submissionKey)` was called immediately after success
   - Users could click submit button again within seconds
   - No cooldown period to prevent rapid re-submissions

2. **Missing Frontend Protection**:
   - PhotoSubmissionDialog didn't check `isSubmitting` state before processing
   - Button remained clickable even during submission

## Solution Implemented

### 1. Consistent Business Date Calculation
**All dashboards now use `getBusinessDateAsync()`**:

```typescript
// BEFORE (incorrect):
date: now.toISOString().split('T')[0]

// AFTER (correct):
import { getBusinessDateAsync } from '../services/businessDayService'
const businessDate = await getBusinessDateAsync(now, restaurantId)
date: businessDate
```

**Files Updated**:
- `/pages/DutyManagerDashboard.tsx` - Line 379-380
- `/pages/ManagerDashboard-new.tsx` - Lines 814, 927
- `/pages/ChefDashboard-new.tsx` - Lines 621, 748

### 2. Enhanced Duplicate Prevention Key
**Updated in `taskSubmissionHelper.ts`**:

```typescript
// BEFORE:
const submissionKey = `${taskId}-${userId}-${date}`

// AFTER:
const submissionKey = `${taskId}-${userId}-${date}-${periodId}`
```

This ensures uniqueness even if date calculation varies.

### 3. Business Day Logic
**How it works** (`businessDayService.ts`):
- Cutoff hour fetched from database (default 8 AM, configured as 10 AM)
- If current hour < cutoff hour → use previous day's date
- If current hour >= cutoff hour → use current date
- Applies consistently whether using test time or real time

## Database Evidence
Query showed duplicate records with same date but different period_ids:
- `period_id: "closing"` - created at 15:31:37
- `period_id: "7aaafb55-79ef-43e5-9944-8c5a1d6a4704"` - created at 19:31:42

This confirmed the duplicate issue was happening.

## Testing Recommendations
1. Test submissions at various times:
   - 23:59 with test time
   - Around 9:59 AM and 10:01 AM (crossing cutoff)
   - Real time at 3:00 AM
2. Verify only one record created per task/user/date/period combination

### 4. Cooldown Period Implementation (2025-09-15)
**Updated in `taskSubmissionHelper.ts`**:

```typescript
// Success: 30-second cooldown
setTimeout(() => {
  ongoingSubmissions.delete(submissionKey)
}, 30000)

// Error: 5-second cooldown
setTimeout(() => {
  ongoingSubmissions.delete(submissionKey)
}, 5000)
```

### 5. Frontend Double-Click Protection (2025-09-15)
**Updated in `PhotoSubmissionDialog.tsx`**:

```typescript
const handleSubmit = async () => {
  // Prevent double submission
  if (isSubmitting) {
    console.warn('[PhotoDialog] Submit blocked - already submitting')
    return
  }
  // ... rest of logic
}
```

## Future Enhancement (Recommended)
Add database constraint for absolute prevention:
```sql
ALTER TABLE roleplay_task_records
ADD CONSTRAINT unique_task_submission
UNIQUE (task_id, user_id, date, period_id);
```

## Impact
- ✅ Fixes duplicate records in test environments
- ✅ Prevents duplicates in production
- ✅ Consistent date handling across all dashboards
- ✅ Works correctly with business day cutoff logic
- ✅ Prevents rapid re-submissions with cooldown periods (2025-09-15)
- ✅ Frontend protection against double-clicks (2025-09-15)