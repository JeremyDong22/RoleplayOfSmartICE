# Roleplay Database Schema & Architecture

## Last Updated: 2025-09-17

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

### roleplay_tasks
- **Purpose**: Task definitions for all roles
- **Key Fields**:
  - `id`: UUID primary key (may include suffixes like `_deyang` for restaurant-specific)
  - `title`: Task name
  - `role_code`: Role responsible (`manager`, `duty_manager`, `chef`)
  - `period_id`: Time period association
  - `restaurant_id`: NULL for universal, UUID for restaurant-specific
  - `is_active`: **DEPRECATED** - Has no meaningful purpose, ignore this field
  - `is_notice`: Boolean for notification-only tasks
  - `is_floating`: Boolean for repeatable tasks
- **Important**: 
  - All existing tasks should be considered active regardless of `is_active` value
  - Some restaurants have duplicate task definitions (needs cleanup)
  // Updated 2025-09-17: is_active column should be ignored completely

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
  - `review_status`: Auto-approved except for duty managers
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

## Department Logic & Role Hierarchy

### Department Assignment
- **后厨 (Kitchen)**: `roleCode === 'chef'`
- **前厅 (Front Office)**: All other roles (`manager`, `duty_manager`, `staff`)
- **Critical**: Always use `roleCode` field, never `role`

### Role Hierarchy (Updated 2025-09-17)
- **Manager**: Responsible for both `manager` and `duty_manager` tasks
- **Duty Manager**: Only responsible for `duty_manager` tasks
- **Chef**: Only responsible for `chef` tasks (separate from manager hierarchy)
- **Important**: Manager's TaskSummary must show both manager and duty_manager tasks
// Updated 2025-09-17: Manager is responsible for ensuring duty_manager tasks are completed

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

### check_business_day_tasks_completed (Enhanced 2025-09-17)
- **Purpose**: Validates if all required tasks are completed before allowing store closure
- **Parameters**: 
  - `p_restaurant_id`: UUID of the restaurant (required)
  - `p_check_date`: Date to check (defaults to CURRENT_DATE)
- **Returns**: Detailed JSON object with:
  - Completion status
  - Missing task details with titles and roles
  - Human-readable validation message
  - Task counts and summaries
- **Logic**: 
  - Queries tasks with `role_code IN ('manager', 'duty_manager')` - excludes chef
  - Ignores `is_active` column completely
  - Excludes notice and floating tasks
  - Checks for approved records in task_records table
- **Wrapper**: `check_business_day_tasks_completed_bool()` for backward compatibility
// Updated 2025-09-17: Enhanced to return detailed JSON instead of just boolean

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

### Manager Task Visibility (Fixed 2025-09-17)
- **Problem**: Manager's TaskSummary not showing duty_manager tasks
- **Solution**: Include both role_code types when role='manager'
- **Important**: Always pass role parameter, never undefined
// Added 2025-09-17: Fixed manager not seeing duty_manager tasks

## Known Data Issues
- **Duplicate Tasks**: Some restaurants have multiple task definitions for same task
  - Example: 德阳店 has tasks with both regular IDs and `_deyang` suffix IDs
  - Same issue with period IDs (regular and `_deyang` suffix)
- **Recommendation**: Audit and clean duplicate task definitions
- **is_active Column**: Should be removed in future migration as it serves no purpose
// Updated 2025-09-17: is_active column is meaningless and should be ignored

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
- Test store closing validation with all tasks completed
- Check for duplicate task definitions in different restaurants
- Verify manager sees duty_manager tasks in TaskSummary
- Test detailed error messages from store closing validation