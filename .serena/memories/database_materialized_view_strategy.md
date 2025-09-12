# Database Materialized View Strategy

## Date: 2025-09-12
## Context: Fixed inventory submission errors for Manager role

## Key Principle
**UI should NEVER directly trigger materialized view refreshes**

## Problem Discovered
When users submitted inventory-related tasks (like "收货验货"), the database trigger `refresh_inventory_on_task_submit` attempted to refresh the `roleplay_inventory_realtime_mv` materialized view. This caused:
1. **Permission Error**: Regular users don't have permission to refresh MVs (401 Unauthorized)
2. **Performance Impact**: Synchronous refresh blocks the UI operation
3. **Poor UX**: Task submission fails or appears to hang

## Current Architecture (After Fix)

### Materialized View: roleplay_inventory_realtime_mv
- Contains pre-calculated inventory analytics
- Includes predicted stock levels, consumption rates, warning indicators
- Has unique index on `id` column for concurrent refresh

### Refresh Strategy
- **Scheduled Refresh**: Every 30 minutes via pg_cron job
- **Job Name**: `refresh_inventory_mv_every_30min` 
- **Schedule**: `*/30 * * * *`
- **Command**: `SELECT refresh_inventory_view();`

### Database Triggers
1. **refresh_inventory_on_task_submit**: Modified to NOT refresh MV
   - Still checks for inventory-related tasks
   - Can be used for logging or notifications
   - No longer calls `refresh_inventory_view()`

2. **trigger_inventory_data_change**: Sends pg_notify for async processing
   - Non-blocking operation
   - Can be used by background workers

## Best Practices
1. **Never use SECURITY DEFINER for UI-triggered operations** - It bypasses security model
2. **Use scheduled refreshes for MVs** - More predictable and efficient
3. **Keep UI operations lightweight** - No heavy database operations
4. **Use pg_notify for async processing** - Decouple UI from background tasks

## Alternative Approaches (Not Recommended)
- ❌ SECURITY DEFINER functions (security risk)
- ❌ On-demand refresh from UI (permission issues)
- ❌ Regular views instead of MVs (performance impact)
- ✅ Scheduled refresh via pg_cron (current solution)

## Monitoring
- Check pg_cron history for refresh success
- Monitor MV staleness if 30 minutes is too long
- Consider adjusting interval based on business needs

## Related Files
- `src/services/inventoryRealtimeService.ts` - Reads from MV
- `src/utils/taskSubmissionHelper.ts` - Fixed error handling
- Database trigger: `refresh_inventory_on_task_submit`
- Database function: `trigger_refresh_after_inventory_task()`