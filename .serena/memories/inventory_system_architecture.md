# Inventory System Architecture

## Overview
The inventory management system is a core feature of the restaurant operations PWA, designed for tracking and managing restaurant inventory with historical tracking and approval workflows.

## Key Components

### Frontend Components
- **InventoryItemPicker**: Selection interface for inventory items
- **InventoryHistory**: Historical tracking and visualization
- **Tab-based Management**: Separate tabs for different inventory categories

### Services
- **inventoryService.ts**: Core inventory CRUD operations
- **inventoryHistoryService.ts**: Historical data tracking

### Database Tables (roleplay_ prefix)
- **roleplay_inventory**: Current inventory items
- **roleplay_inventory_history**: Historical inventory changes
- **roleplay_inventory_categories**: Item categorization
- **roleplay_inventory_submissions**: Pending approvals

## Performance Optimizations
- **Preloading Strategy**: Data fetched before tab switches
- **Lazy Loading**: Components loaded on demand
- **Caching**: Local caching of frequently accessed data
- **Batch Operations**: Multiple items processed together

## Workflow
1. Staff submits inventory counts
2. Photos attached for verification
3. Manager reviews and approves
4. Historical record created
5. Analytics updated

## Recent Improvements (2025)
- 71% performance improvement in loading
- Proper data preloading for all tabs
- Fixed tab switching issues
- Optimized data fetching patterns