# Vite Import and Cache Errors - Common Fixes

## Issue Date: 2025-09-13
## Version: 1.0.3

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

#### 2. Missing ErrorBoundary Import (Silent White Page)
**Error**: App shows blank white page with no console errors

**Root Cause**: Missing import statement for ErrorBoundary while it's being used in JSX

**Solution**:
```typescript
// Add this import in App.tsx
import { ErrorBoundary } from './components/ErrorBoundary'
```

**Key Learning**: Missing component imports can cause silent failures where:
- No TypeScript errors in dev mode
- No console errors visible
- Just a blank white page
- Browser shows raw HTML instead of rendered React app

#### 3. Missing import path resolution
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

#### 4. Multiple exports with the same name
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

#### 5. Cache Prevention Strategy
To prevent browser caching issues after fixes:

1. Clear Vite cache:
```bash
rm -rf node_modules/.vite
```

2. Restart the dev server:
```bash
# Kill all node processes
pkill -f "npm run dev"
# Restart
npm run dev
```

3. If port is busy, Vite will use next available port (5174, 5175, etc.)

#### 6. Runtime.lastError: Message port closed
**Error**: `Unchecked runtime.lastError: The message port closed before a response was received`

**Solution**:
- This is usually a browser extension issue (React DevTools, etc.)
- Can be safely ignored in development
- Clear browser cache if persistent

#### 7. WebSocket Connection Errors
**Error**: `WebSocket connection to 'ws://localhost:5173/?token=xxx' failed`

**Cause**: Multiple dev servers running on different ports

**Solution**:
- Kill all dev servers
- Start fresh on single port
- Close old browser tabs pointing to old ports

### Debugging Silent Loading Issues

When you see infinite loading or white pages:

1. **Check Browser Console** - Look for any errors
2. **Check Network Tab** - Verify files are loading
3. **Create Simple Test** - Make a minimal React component
4. **Add Console Logs** - Strategic placement in main.tsx and App.tsx
5. **Check Imports** - Missing imports cause silent failures
6. **Run Build** - `npm run build` catches more errors than dev mode
7. **Add Error Boundaries** - Wrap app with global error handlers

### Quick Troubleshooting Checklist
1. ✅ Check all imported files exist
2. ✅ Verify ALL components used in JSX are imported
3. ✅ No duplicate exports in the same file
4. ✅ Correct import paths (especially for utils)
5. ✅ Clear Vite cache if weird behavior
6. ✅ Kill all dev servers and restart fresh
7. ✅ Close old browser tabs with cached connections

### Project Structure Notes
- Dashboard components are in `/src/pages/`
- Utils are in `/src/utils/`
- Common utility `getRestaurantId` is in `restaurantSetup.ts`
- PhotoSubmissionDialog is in `/src/components/PhotoSubmissionDialog/`
- ErrorBoundary is in `/src/components/ErrorBoundary.tsx`