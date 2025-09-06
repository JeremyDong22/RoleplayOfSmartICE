# Vite Import and Cache Errors - Common Fixes

## Issue Date: 2025-09-06
## Version: 1.0.2

### Common Errors and Solutions

#### 1. Failed to fetch dynamically imported module
**Error**: `TypeError: Failed to fetch dynamically imported module: http://localhost:5173/src/pages/ManagerDashboard-new.tsx`

**Solutions**:
- Ensure the file exists and is properly exported
- Check that the component is exported with the correct name
- For lazy loading in React Router, use:
```typescript
const ManagerDashboard = lazy(() => {
  return import('./pages/ManagerDashboard-new').then(module => ({ default: module.ManagerDashboard }));
});
```

#### 2. Missing import path resolution
**Error**: `Failed to resolve import "../../utils/getRestaurantId" from "src/components/PhotoSubmissionDialog/PhotoSubmissionDialog.tsx"`

**Solution**:
- Check if the import path is correct
- Common fix: `getRestaurantId` is usually in `utils/restaurantSetup` not `utils/getRestaurantId`
```typescript
// Wrong
import { getRestaurantId } from '../../utils/getRestaurantId'
// Correct
import { getRestaurantId } from '../../utils/restaurantSetup'
```

#### 3. Multiple exports with the same name
**Error**: `ERROR: Multiple exports with the same name "PhotoSubmissionDialog"`

**Solution**:
- Check for duplicate export statements
- Use either named export in declaration OR at the end, not both:
```typescript
// Option 1: Export in declaration
export const PhotoSubmissionDialog: React.FC = () => { ... }

// Option 2: Export at end (don't use both!)
const PhotoSubmissionDialog: React.FC = () => { ... }
export { PhotoSubmissionDialog }
```

#### 4. Cache Prevention Strategy
To prevent browser caching issues after fixes:

1. Update version number in comments:
```typescript
// VERSION 1.0.2 - Using lazy loading for dashboards
// Cache prevention via version comment to force rebuild
```

2. Restart the dev server:
```bash
# Kill the current process
# Then restart
npm run dev
```

3. For production builds, Vite automatically handles cache busting with content hashes.

#### 5. Runtime.lastError: Message port closed
**Error**: `Unchecked runtime.lastError: The message port closed before a response was received`

**Solution**:
- This is usually a browser extension issue (React DevTools, etc.)
- Can be safely ignored in development
- Clear browser cache if persistent

### Quick Troubleshooting Checklist
1. ✅ Check all imported files exist
2. ✅ Verify export statements match import expectations
3. ✅ No duplicate exports in the same file
4. ✅ Correct import paths (especially for utils)
5. ✅ Restart dev server after major changes
6. ✅ Clear browser cache if needed

### Project Structure Notes
- Dashboard components are in `/src/pages/`
- Utils are in `/src/utils/`
- Common utility `getRestaurantId` is in `restaurantSetup.ts`
- PhotoSubmissionDialog is in `/src/components/PhotoSubmissionDialog/`