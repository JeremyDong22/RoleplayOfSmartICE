# Roleplay Database Schema & Architecture

## Last Updated: 2025-09-13

## Overview
All database tables use the `roleplay_` prefix to distinguish from standard restaurant operations tables. The system uses custom authentication (NOT Supabase Auth) with UUID-based identifiers.

## Core Tables

### roleplay_users
- **Purpose**: Custom authentication system
- **Key Fields**:
  - `id`: UUID primary key
  - `username`: Unique username
  - `email`: Format `username.demo@gmail.com`
  - `roleCode`: Used for role detection (NOT `role` field)
  - `full_name`: Display name
  - `restaurant_id`: Restaurant association
- **Authentication**: Cookie-based, NOT Supabase Auth

### roleplay_task_records
- **Purpose**: Stores completed task submissions
- **Key Fields**:
  - `id`: UUID primary key
  - `task_id`: Reference to task
  - `user_id`: Submitting user
  - `date`: Business date (respects 10 AM cutoff)
  - `period_id`: Time period or specific period UUID
  - `metadata`: JSONB field for additional data
  - `structured_data`: JSONB for inventory/form data
  - `approval_status`: Auto-approved except for duty managers
- **Important**: Random inspections store zone/table info in metadata

### roleplay_inventory_items
- **Purpose**: Master inventory item list
- **Key Fields**:
  - `restaurant_id`: Restaurant association
  - `item_name`: Item identifier
  - `unit`: Measurement unit
  - `department`: '前厅' or '后厨'
  - `category`: Item grouping
  - `subcategory`: Sub-grouping
- **No Quantities**: Actual quantities calculated from task_records

### roleplay_inventory_realtime_mv (Materialized View)
- **Purpose**: Pre-calculated inventory analytics
- **Contents**: Stock predictions, consumption rates, warnings
- **Refresh**: Every 30 minutes via pg_cron (NOT on task submission)
- **Index**: Unique on `id` for concurrent refresh safety

## Department Logic
- **后厨 (Kitchen)**: `roleCode === 'chef'`
- **前厅 (Front Office)**: All other roles (`manager`, `duty_manager`, `staff`)
- **Critical**: Always use `roleCode` field, never `role`

## Business Rules

### Auto-Approval Logic
- **Auto-Approved**: All roles except duty manager
- **Requires Approval**: Only duty manager tasks need store manager approval
- **Trigger**: `trigger_auto_approve_manager_chef`

### Business Date Calculation
- **Cutoff**: 10:00 AM (configurable in database)
- **Logic**: Tasks before 10 AM belong to previous business day
- **Service**: `businessDayService.ts` handles this consistently
- **Critical**: All dashboards must use `getBusinessDateAsync()`

### Duplicate Prevention
- **Key Format**: `${taskId}-${userId}-${date}-${periodId}`
- **Files**: Handled in `taskSubmissionHelper.ts`
- **Database**: Consider adding unique constraint for absolute prevention

## Triggers & Functions

### trigger_auto_approve_manager_chef
- Automatically approves tasks for manager/chef roles
- Only duty manager tasks require manual approval

### trigger_inventory_data_change
- Sends pg_notify for inventory changes
- Non-blocking async notification system

### refresh_inventory_on_task_submit (Modified 2025-09-12)
- **Previous**: Refreshed MV on task submission (caused permission errors)
- **Current**: No longer refreshes MV to avoid UI blocking
- **Replacement**: 30-minute scheduled refresh via pg_cron

## Random Inspection Feature
- **Tables Mapping**:
  ```typescript
  const tables = {
    'A区': ['A1', 'A2'],
    'B区': ['B1', 'B2'], 
    'C区': ['C1', 'C2']
  }
  ```
- **Metadata Storage**: Zone and table stored in task_records.metadata
- **Selection**: True randomization using Math.random()

## Performance Optimizations
- **Service Caching**: 5-minute inventory data cache
- **Lazy Loading**: Proxy-based service initialization
- **Department Filtering**: Only load relevant department items
- **Scheduled MV Refresh**: Every 30 minutes instead of on-demand
- **Batch Operations**: Multiple items processed together

## Common Issues & Fixes

### Permission Errors (Fixed 2025-09-12)
- **Problem**: UI triggering MV refresh caused "must be owner" errors
- **Solution**: Removed MV refresh from triggers, use scheduled refresh

### Role Detection Bugs (Fixed 2025-01-07)
- **Problem**: Code using `user?.role` instead of `user?.roleCode`
- **Solution**: Always use `roleCode` for department logic

### Duplicate Records (Fixed 2025-09-13)
- **Problem**: Inconsistent business date calculation
- **Solution**: All dashboards use `getBusinessDateAsync()`

## Database Access Patterns
- **Standard Operations**: Direct Supabase client calls
- **Roleplay Tables**: Use supabase-roleplay-manager agent
- **Migrations**: Use `mcp__supabase-mcp__apply_migration`
- **Queries**: Use `mcp__supabase-mcp__execute_sql`

## Testing Considerations
- Test with all user roles (chef, manager, duty_manager, staff)
- Verify department filtering works correctly
- Test business date logic around 10 AM cutoff
- Check random inspection metadata storage
- Verify auto-approval logic for different roles