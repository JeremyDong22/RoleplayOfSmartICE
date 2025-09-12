# Inventory System Architecture

## Overview
The inventory management system is a core feature of the restaurant operations PWA, designed for tracking and managing restaurant inventory with department-based separation (前厅/后厨).

## Key Components

### Frontend Components
- **InventoryItemPicker**: Selection interface for inventory items with department filtering
- **InventoryHistory**: Historical tracking and visualization
- **Tab-based Management**: Separate tabs for different inventory categories
- **StructuredInputDialog**: Dynamic form generation for inventory tasks
- **PhotoSubmissionDialog**: Multi-view photo submission with inventory selection

### Services
- **inventoryService.ts**: Core inventory operations with caching
  - `getInventoryItems(department)`: Fetch items by department
  - `generateStructuredFields()`: Dynamic field generation for forms
  - 5-minute cache duration for performance
- **inventoryManagementService.ts**: Admin-level inventory management
- **inventoryHistoryService.ts**: Historical data tracking
- **inventoryRealtimeService.ts**: Real-time inventory data from materialized view
- **inventoryOptimizedService.ts**: Optimized queries for inventory operations

### Database Tables & Views
- **roleplay_inventory_items**: Main inventory items table
  - Fields: id, restaurant_id, item_name, unit, department, category, subcategory
  - Department-based filtering (前厅/后厨)
  - No quantity storage (calculated from task_records)
- **roleplay_task_records**: Stores actual inventory submissions
  - Contains structured_data with quantities and prices
  - Historical tracking through submissions
- **roleplay_inventory_realtime_mv**: Materialized view for inventory analytics
  - Refreshes every 30 minutes via pg_cron (as of 2025-09-12)
  - No longer refreshes on task submission to avoid permission issues
  - Contains predicted stock, consumption rates, and warning indicators

## Department Logic
- **后厨 (Kitchen)**: Used by chef role (`roleCode === 'chef'`)
- **前厅 (Front Office)**: Used by all other roles (manager, duty_manager, staff)
- Department determined by: `user?.roleCode === 'chef' ? '后厨' : '前厅'`

## Performance Optimizations
- **Service Caching**: 5-minute cache for inventory data
- **Lazy Service Loading**: Proxy-based deferred initialization
- **Department-specific Loading**: Only loads relevant department items
- **Batch Operations**: Multiple items processed together
- **Scheduled MV Refresh**: Every 30 minutes instead of on-demand

## Database Triggers
- **trigger_auto_approve_manager_chef**: Auto-approves manager/chef tasks
- **trigger_inventory_data_change**: Sends pg_notify for inventory changes
- **refresh_inventory_on_task_submit**: Modified to NOT refresh MV (2025-09-12)

## Common Issues Fixed
- **PhotoSubmissionDialog Bug**: Fixed incorrect role field usage (was `user?.role`, now `user?.roleCode`)
- **Cross-department Data**: Prevented 后厨 users from seeing 前厅 items
- **MV Permission Error (2025-09-12)**: 
  - Fixed "must be owner of materialized view" error
  - Removed automatic MV refresh from trigger
  - Set up 30-minute scheduled refresh via pg_cron
- **JavaScript Reference Error (2025-09-12)**:
  - Fixed `submitError is not defined` in taskSubmissionHelper.ts:655
  - Changed to correctly reference `error` variable

## Workflow
1. User opens task with inventory requirement
2. System loads department-specific items
3. Dynamic fields generated based on task type
4. User selects items and enters quantities
5. Data stored in task_records with structured_data
6. Historical tracking maintained
7. MV refreshes every 30 minutes for analytics

## Recent Updates
- **2025-01-07**: Fixed department detection bug in PhotoSubmissionDialog
- **2025-09-12**: Fixed inventory submission errors for "收货验货" tasks
  - Removed automatic MV refresh causing permission errors
  - Fixed JavaScript reference error in error handling
  - Implemented scheduled MV refresh strategy