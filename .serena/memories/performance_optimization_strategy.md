# Performance Optimization Strategy

## Last Updated: 2025-01-19

### Database Query Parallelization (2025-01-19)
**Problem**: Manager and Chef dashboards loading sequentially, causing 7.7s+ load times
**Solution**: Implemented Promise.all() for parallel query execution

#### Implementation Pattern
```javascript
// Before: Sequential (7.7s)
await refreshFromDatabase();
const completedIds = await getTodayCompletedTaskIds(userId);
const taskStatuses = await getTodayTaskStatuses(userId);

// After: Parallel (4.0s)
const [dutyManagerResult, completedIds, taskStatuses] = await Promise.all([
  refreshFromDatabase(),
  getTodayCompletedTaskIds(userId),
  getTodayTaskStatuses(userId)
]);
```

#### Results Achieved
- **Manager Dashboard**: 7.7s → 4.0s (48% improvement)
- **Chef Dashboard**: ~4s → ~2s (40-50% improvement)
- **TaskService (Duty Manager)**: 2.7s → 1.6s (40% improvement)

#### Key Principles
1. Identify independent operations that don't share dependencies
2. Group them using Promise.all() for parallel execution
3. Keep dependent operations sequential (e.g., review tasks need completed tasks)
4. Add performance logging to measure improvements

### Remaining Bottlenecks
Individual queries still slow due to database/network latency:
- DutyManagerContext refresh: ~2.8s
- Completed tasks query: ~2.4s
- Task statuses query: ~2.9s

### Future Optimization Opportunities

#### 1. Database Indexing (Priority: High)
```sql
-- Suggested indexes for roleplay_task_records
CREATE INDEX idx_task_records_user_date 
  ON roleplay_task_records(user_id, date, status);
  
CREATE INDEX idx_task_records_restaurant_date 
  ON roleplay_task_records(restaurant_id, date);
  
CREATE INDEX idx_task_records_review_pending
  ON roleplay_task_records(review_status, date) 
  WHERE review_status = 'pending';
```

#### 2. Query Optimization
- Use SELECT with specific columns instead of SELECT *
- Add LIMIT clauses where appropriate
- Consider pagination for large result sets
- Batch similar queries when possible

#### 3. Caching Strategy
- Implement 5-minute TTL memory cache for:
  - Completed task IDs (invalidate on new submission)
  - Task statuses (invalidate on status change)
  - Workflow periods (rarely change, can cache longer)
- Use React Query or similar for intelligent cache management

#### 4. Network Optimization
- Implement connection pooling if not already present
- Consider using WebSockets for real-time updates instead of polling
- Batch API calls where possible
- Reduce interval timer from 1s to 5s for period checks (implemented)

### Performance Monitoring Best Practices
1. Always add performance.now() timing for critical operations
2. Log both query time and result count for analysis
3. Use console.log with [PERF] prefix for easy filtering
4. Track parallel vs sequential execution times
5. Monitor for regression after changes

### Lessons Learned
- Parallel execution provides immediate 40-50% improvements
- Database query optimization is critical for sub-second response
- User feedback (loading progress) is essential during long operations
- Small optimizations compound (5s interval vs 1s = 80% reduction in checks)

### Applied Files
- `/src/pages/ManagerDashboard-new.tsx`
- `/src/pages/ChefDashboard-new.tsx`
- `/src/services/taskService.ts`
- `/src/services/restaurantConfigService.ts` (cleaned up logging)