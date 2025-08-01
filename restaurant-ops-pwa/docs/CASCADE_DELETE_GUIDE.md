# Task Record Cascade Delete Guide

## Overview
This guide explains how the cascade delete functionality works for `roleplay_task_records` in the Supabase database.

## What Gets Deleted

When you delete a record from `roleplay_task_records`, the following happens automatically:

1. **Database Trigger** (automatic):
   - Deletes the corresponding record from `roleplay_task_summary` table
   - Matches by ID first, then by date/period/user/task if no direct match

2. **Storage Cleanup** (requires client-side code):
   - Photo files referenced in `photo_urls` array
   - Audio file referenced in `audio_url`
   - Storage files must be deleted using the client service

## How to Use

### Method 1: Using the Client Service (Recommended)

```typescript
import { deleteTaskRecordWithStorage } from '@/services/taskRecordDeletionService'

// Delete a single task record with storage cleanup
const result = await deleteTaskRecordWithStorage('task-record-id')

if (result.success) {
  console.log(`Deleted ${result.deletedFiles.length} storage files`)
} else {
  console.error('Deletion failed:', result.errors)
}
```

### Method 2: Direct Database Deletion

If you delete directly from the database, the trigger will handle task_summary deletion, but storage files won't be cleaned up:

```typescript
// This will trigger task_summary deletion but NOT storage cleanup
const { error } = await supabase
  .from('roleplay_task_records')
  .delete()
  .eq('id', 'task-record-id')
```

### Batch Operations

```typescript
import { batchDeleteTaskRecords, deleteTaskRecordsByDate } from '@/services/taskRecordDeletionService'

// Delete multiple records
const { results, summary } = await batchDeleteTaskRecords(['id1', 'id2', 'id3'])

// Delete all records for a specific date
const { deletedCount, errors } = await deleteTaskRecordsByDate('2025-01-31')

// Delete records for a specific user on a date
const { deletedCount, errors } = await deleteTaskRecordsByDate('2025-01-31', 'user-id')
```

## Database Trigger Details

The trigger `handle_task_record_deletion()` runs BEFORE DELETE on `roleplay_task_records`:

1. Logs storage URLs that need cleanup (for debugging)
2. Attempts to delete from `roleplay_task_summary` by ID
3. If no ID match, tries matching by:
   - date
   - period_id
   - user_name (from roleplay_users)
   - task_title (from roleplay_tasks)

## Testing

Run the test script to verify the trigger is working:

```bash
cd restaurant-ops-pwa
node scripts/test-cascade-delete.js
```

## Important Notes

1. **Storage Cleanup**: The database trigger cannot delete storage files directly. Always use the client service for complete cleanup.

2. **Performance**: For large batch deletions, consider implementing pagination to avoid timeouts.

3. **Error Handling**: The trigger uses exception handling to ensure the delete operation succeeds even if cascade operations fail.

4. **Permissions**: Ensure your Supabase role has permission to:
   - Delete from `roleplay_task_records`
   - Delete from `roleplay_task_summary`
   - Delete from storage bucket `restaurant-tasks`

## Troubleshooting

### Storage files not being deleted
- Make sure you're using `deleteTaskRecordWithStorage()` instead of direct database deletion
- Check that the storage bucket permissions allow deletion
- Verify the file paths are being extracted correctly from URLs

### Task summary not being deleted
- Check if the ID matches between tables
- Verify the user and task relationships are correct
- Look for trigger errors in Supabase logs

### Permission errors
- Ensure the authenticated user has delete permissions
- Check RLS policies on both tables
- Verify storage bucket policies