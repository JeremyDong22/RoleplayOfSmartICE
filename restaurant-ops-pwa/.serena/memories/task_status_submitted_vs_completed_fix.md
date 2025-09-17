# Task Status: Submitted vs Completed Fix

## Issue Identified
Date: 2025-09-18

The store closing validation was failing to recognize completed tasks because of a status mismatch in the database function `check_store_closing_validation`.

## Root Cause
- The function was checking for `status = 'completed'` in the roleplay_task_records table
- However, the actual records use `status = 'submitted'` to indicate a task has been completed
- This is the intended behavior - tasks go from 'pending' to 'submitted' when completed

## Status Values in System
Based on database analysis:
- `pending` - Default status for new task records
- `submitted` - Task has been completed by the user
- `completed` - Rarely used (only 15 records vs 729 submitted)
- `in_progress` - Task is being worked on

## Solution Applied
Updated the `check_store_closing_validation` function to check for `status = 'submitted'` instead of `status = 'completed'` in all three CTEs:
1. closing_period_tasks
2. other_period_tasks (first occurrence for grouping)
3. other_period_tasks (second occurrence for summary)

## Related Information
- The auto_approve_manager_chef_tasks trigger sets `review_status = 'approved'` for manager and chef tasks
- The main `status` field remains 'submitted' after task completion
- This aligns with the business logic where 'submitted' means the task is done

## Testing Confirmed
After the fix, all 7 closing period tasks from Sept 17, 2025 are correctly showing as completed in the validation check.