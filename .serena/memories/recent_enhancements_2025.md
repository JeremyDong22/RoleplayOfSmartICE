# Recent Enhancements & Features (2025)

## Last Updated: 2025-01-06

### Performance Optimizations
- **Inventory Loading**: 71% performance improvement through optimized data fetching
- **Lazy Service Initialization**: Using Proxy for deferred service loading
- **Data Preloading**: Implemented for inventory tabs to improve UX

### New Components Added
- **GlobalRefreshButton**: Soft/hard refresh capabilities with 2-second tooltip
- **UploadQueueIndicator**: Shows pending upload status with retry mechanism
- **InventoryHistory**: Track inventory changes over time
- **InventoryItemPicker**: Streamlined item selection interface
- **AudioRecordingDialog**: Audio submission capability
- **FaceVerification**: Face-API.js integration for authentication
- **CacheManager**: PWA cache management utilities
- **TimeControl**: Time manipulation for testing/demo

### Recent Fixes (from git log)
1. Multi-view PhotoSubmissionDialog restored for 收货验货 tasks
2. Fixed React initialization errors in production builds
3. Removed circular dependencies
4. Fixed task filtering for restaurant-specific views
5. Optimized inventory management loading behavior
6. Fixed authentication issues in refresh button

### Active Features
- Progressive Web App with offline support
- IndexedDB for failed upload persistence
- Network-aware image compression
- Role-based dashboards (CEO, Manager, Chef, Staff)
- Real-time updates via Supabase subscriptions
- Face recognition authentication option

### Database Pattern
- All tables use `roleplay_` prefix
- UUID-based task and record IDs
- Automatic approval for non-manager roles
- Restaurant-specific data filtering