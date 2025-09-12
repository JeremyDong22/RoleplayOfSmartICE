# Task Period Detection Fix (2025-09-12)

## Issue
Task Summary component incorrectly showed closing period tasks (闭店/收市与打烊) as missing during afternoon hours, even though the period hadn't started yet.

## Root Cause
Two service files had the same logic error in handling cross-day periods:
1. `src/services/taskRecordService.ts`
2. `src/services/taskSummaryService.ts`

### The Bug
For cross-day periods like closing (21:30-00:00), when checking if the period had ended:
```typescript
// WRONG - marked as ended during afternoon
} else if (currentTimeInMinutes < periodStartMinutes) {
  periodEnded = true  // ❌ Bug
}
```

## Solution
Fixed in both files to correctly handle cross-day periods:
```typescript
// CORRECT - not ended, just hasn't started yet
} else if (currentTimeInMinutes < periodStartMinutes) {
  periodEnded = false  // ✅ Fixed
}
```

## Files Modified
- `src/services/taskRecordService.ts` - Line 731
- `src/services/taskSummaryService.ts` - Line 237

## Database Changes
- Updated closing period from 21:30-03:00 to 21:30-00:00 to simplify logic
- SQL: `UPDATE roleplay_workflow_periods SET end_time = '00:00:00' WHERE name = '收市与打烊'`

## Service Architecture
- **taskRecordService**: Lower-level service for CRUD operations with `roleplay_task_records` table
  - `getRealTimeCompletionRate()` - Provides real-time completion data and missing tasks
- **taskSummaryService**: Higher-level service for statistics and summaries
  - `getTaskSummaryStats()` - Provides aggregated statistics

Both services calculate missing tasks independently, which is why both needed the same fix.

## Testing
Verified with SQL that closing tasks correctly show as "未开始 - 不统计" (not started - don't count) during afternoon hours.