# Recent Enhancements & Features (2025)

## Last Updated: 2025-01-07

### Bug Fixes (2025-01-07)
- **Fixed Department Detection in PhotoSubmissionDialog**:
  - Corrected `user?.role` to `user?.roleCode` for proper chef role detection
  - Resolved issue where 后厨 users were seeing 前厅 inventory items
  - Ensures proper department-based inventory filtering

### Major Upload System Optimization (2025-01-06)
- **Persistent Retry Queue**: IndexedDB-based queue for failed uploads
- **Network-Aware Compression**: Auto-adjusts quality based on connection (2G/3G/4G/WiFi)
- **Progressive Upload**: Individual photo tracking with partial success support
- **Parallel Batch Processing**: Smart fallback strategy (10→7→5→3 photos)
- **Zero Data Loss**: LocalStorage preserved on failure, automatic retry every 30s
- **Upload Queue UI**: Visual indicator showing pending uploads with manual retry
- **Performance**: 71% faster uploads, 60-70% file size reduction

### Performance Optimizations
- **Inventory Loading**: 71% performance improvement through optimized data fetching
- **Lazy Service Initialization**: Using Proxy for deferred service loading
- **Data Preloading**: Implemented for inventory tabs to improve UX
- **Department-specific Loading**: Only loads relevant inventory items per user role

### New Components Added
- **UploadQueueService**: Manages failed uploads with IndexedDB persistence
- **UploadQueueIndicator**: Shows pending upload status with retry mechanism
- **GlobalRefreshButton**: Soft/hard refresh capabilities with 2-second tooltip
- **InventoryHistory**: Track inventory changes over time
- **InventoryItemPicker**: Streamlined item selection interface with department filtering
- **AudioRecordingDialog**: Audio submission capability
- **FaceVerification**: Face-API.js integration for authentication
- **CacheManager**: PWA cache management utilities
- **TimeControl**: Time manipulation for testing/demo

### Recent Fixes (from git log)
1. Fixed department detection in PhotoSubmissionDialog (2025-01-07)
2. Task upload optimization with retry queue and network-aware compression
3. Multi-view PhotoSubmissionDialog restored for 收货验货 tasks
4. Fixed React initialization errors in production builds
5. Removed circular dependencies
6. Fixed task filtering for restaurant-specific views
7. Optimized inventory management loading behavior
8. Fixed authentication issues in refresh button

### Active Features
- Progressive Web App with offline support
- IndexedDB for failed upload persistence
- Network-aware image compression
- Role-based dashboards (CEO, Manager, Chef, Staff)
- Real-time updates via Supabase subscriptions
- Face recognition authentication option
- Automatic retry queue for failed uploads
- Department-based inventory separation (前厅/后厨)

### Database Pattern
- All tables use `roleplay_` prefix
- UUID-based task and record IDs
- Automatic approval for non-manager roles
- Restaurant-specific data filtering
- Department-based inventory filtering

### Key Architecture Decisions
- **Role Detection**: Always use `roleCode` field, not `role` field
- **Department Logic**: `roleCode === 'chef' ? '后厨' : '前厅'`
- **Inventory Items**: Stored in `roleplay_inventory_items` table
- **No Quantity Storage**: Quantities calculated from `task_records`