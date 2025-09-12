# Refresh Button Behavior Documentation

## Last Updated: 2025-01-13

### Component Location
`/restaurant-ops-pwa/src/components/GlobalRefreshButton/GlobalRefreshButton.tsx`

## Refresh Button Behaviors

### Short Press (Standard Refresh)
**Behavior**: Same as browser F5/Command+R refresh
- Executes `window.location.reload()`
- Reloads entire page and React application
- Re-fetches all JavaScript, CSS resources
- Re-initializes all services
- Preserves localStorage, sessionStorage, cookies
- Preserves IndexedDB data
- Preserves Service Worker and caches

### Long Press (2 seconds) - Deep Clean
**Behavior**: Complete cache and storage cleanup
1. Clears all localStorage
2. Clears all sessionStorage
3. Deletes all IndexedDB databases
4. Clears all cookies
5. Deletes all cache storage
6. Unregisters all Service Workers
7. Redirects to homepage and reloads

## Data Refreshed on Page Reload

### Database Tables (from Supabase)
- `roleplay_workflow_periods` - Work periods (morning/afternoon/evening shifts)
- `roleplay_tasks` - All task definitions
- `roleplay_task_records` - Task submission records
- `roleplay_users` - User information including face data
- `roleplay_roles` - Role permissions
- `roleplay_restaurants` - Restaurant configuration
- `roleplay_inventory_items` - Inventory item list
- `roleplay_inventory_records_view` - Inventory records view
- `roleplay_inventory_realtime_view` - Real-time inventory status
- `roleplay_notice_responses` - Notification responses

### Services Re-initialized
1. **TaskService**
   - Reloads all task periods
   - Reloads all tasks (restaurant-specific + global)
   - Re-subscribes to real-time changes (2-second delay)

2. **Real-time Subscriptions**
   - Re-establishes WebSocket connections
   - Re-subscribes to database change notifications
   - Re-monitors real-time updates

3. **Cache Updates**
   - Clears in-memory caches
   - Rebuilds task cache
   - Rebuilds period cache

### UI Updates
- Resets all component states
- Re-renders all pages
- Recalculates business day status
- Updates last refresh timestamp

### Preserved Data (Standard Refresh)
- Authentication tokens (maintains login state)
- Service Worker (unless deep clean)
- Downloaded face recognition models
- All browser storage (unless deep clean)

## Context Component
`/restaurant-ops-pwa/src/contexts/RefreshContext.tsx`
- Manages refresh state across application
- Provides `triggerRefresh` function
- Tracks last refresh time
- Handles soft/hard refresh modes (deprecated in favor of standard reload)

## Visual Indicators
- Rotation animation during refresh
- Success checkmark after completion
- Error shake animation on failure
- Progress circle during long press
- Tooltip showing refresh type

## Implementation Notes
- Short press delay: 300ms (for visual feedback)
- Long press threshold: 2000ms (2 seconds)
- Success message duration: 1500ms
- Uses Material-UI Fab component
- Position: bottom-right, above navigation bar