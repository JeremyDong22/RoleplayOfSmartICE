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

## Visual Indicators & Animation

### Long Press Progress Circle
- **Color**: Red (`error.main`) for warning/attention
- **Size**: Slightly larger than button (56/72/84px based on button size)
- **Position**: Centered over button using `inline-flex` layout
- **Rotation**: Completes 360° rotation in 2 seconds (matching long-press duration)
- **Update Rate**: 10ms intervals for smooth animation
- **Transform**: Rotates based on progress (each 1% = 3.6 degrees)

### Button States
- **Normal**: Blue primary color
- **Long Press Active**: Secondary color with scale(1.15)
- **Success**: Green with checkmark icon
- **Error**: Red with shake animation
- **Loading**: Continuous rotation with pulse effect

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

## Implementation Notes
- Short press delay: 300ms (for visual feedback)
- Long press threshold: 2000ms (2 seconds)
- Long press progress update: Every 10ms for smooth animation
- Success message duration: 1500ms
- Uses Material-UI Fab component
- Position: bottom-right, above navigation bar
- Initial tooltip: Shows for 2 seconds on mount