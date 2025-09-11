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

### Database Tables
- **roleplay_inventory_items**: Main inventory items table
  - Fields: id, restaurant_id, item_name, unit, department, category, subcategory
  - Department-based filtering (前厅/后厨)
  - No quantity storage (calculated from task_records)
- **roleplay_task_records**: Stores actual inventory submissions
  - Contains structured_data with quantities and prices
  - Historical tracking through submissions

## Department Logic
- **后厨 (Kitchen)**: Used by chef role (`roleCode === 'chef'`)
- **前厅 (Front Office)**: Used by all other roles (manager, duty_manager, staff)
- Department determined by: `user?.roleCode === 'chef' ? '后厨' : '前厅'`

## Performance Optimizations
- **Service Caching**: 5-minute cache for inventory data
- **Lazy Service Loading**: Proxy-based deferred initialization
- **Department-specific Loading**: Only loads relevant department items
- **Batch Operations**: Multiple items processed together

## Common Issues Fixed
- **PhotoSubmissionDialog Bug**: Fixed incorrect role field usage (was `user?.role`, now `user?.roleCode`)
- **Cross-department Data**: Prevented 后厨 users from seeing 前厅 items

## Workflow
1. User opens task with inventory requirement
2. System loads department-specific items
3. Dynamic fields generated based on task type
4. User selects items and enters quantities
5. Data stored in task_records with structured_data
6. Historical tracking maintained

## Recent Updates (2025-01-07)
- Fixed department detection bug in PhotoSubmissionDialog
- Corrected role field from `user?.role` to `user?.roleCode`
- Ensured proper department-based inventory filtering