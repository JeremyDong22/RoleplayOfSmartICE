# Debugging Best Practices for React/Vite Apps

## Created: 2025-09-13
## Version: 1.1.0

### Silent Loading Issues (White Page of Death)

#### Symptoms
- Browser shows blank white page
- No console errors visible
- Loading spinner runs forever
- Page source shows raw HTML instead of React app

#### Common Causes
1. **Missing imports** - Component used but not imported
2. **Syntax errors** - Unclosed brackets, missing commas
3. **Module resolution failures** - Wrong import paths
4. **React StrictMode double rendering** - Causes duplicate logs
5. **Cache issues** - Old cached modules

#### Debugging Strategy

##### 1. Quick Checks
```bash
# Check if TypeScript compiles
npm run build

# Check current directory
pwd

# Check if server is running
lsof -i :5173
```

##### 2. Create Minimal Test
```typescript
// src/SimpleApp.tsx
export default function SimpleApp() {
  console.log('SimpleApp rendering')
  return <h1>Test Works!</h1>
}

// Temporarily replace main.tsx import
```

##### 3. Add Global Error Handlers
```typescript
// In main.tsx
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error)
  // Show visible error on page
  const errorDiv = document.createElement('div')
  errorDiv.style.cssText = 'position:fixed;top:0;background:red;color:white;padding:20px'
  errorDiv.textContent = `Error: ${event.error?.message}`
  document.body.appendChild(errorDiv)
})
```

##### 4. Progressive Console Logging
```typescript
console.log('1. Before imports')
import { Component } from './Component'
console.log('2. After Component import')
// Identifies which import fails
```

### Network & Timeout Issues (Added 2025-09-13)

#### Problem: UI Shows Failure But Backend Succeeds
- Frontend timeout triggers before backend completes
- Race conditions between timeout and actual processing
- Control flow bugs causing success to be treated as failure

#### Debugging Approach

##### 1. Analyze Log Sequence
```javascript
// Look for patterns like:
"Submission successful: [id]"  // Backend succeeded
"Submission failed: timeout"   // But UI shows failure
```

##### 2. Check Control Flow
```javascript
// Common bug pattern:
} catch (error) {
  console.error('Error:', error)
  // Missing return! Code continues...
}
// This code runs even after catch!
```

##### 3. Add Timing Logs
```javascript
const startTime = Date.now()
try {
  const result = await operation()
  console.log(`Success in ${Date.now() - startTime}ms`)
} catch (error) {
  console.log(`Failed after ${Date.now() - startTime}ms`)
}
```

##### 4. Test with Network Throttling
- Chrome DevTools → Network → Slow 3G
- Observe actual timing vs timeout settings
- Check if operations complete after timeout

### Console Log Management

#### Problem: Too Many Redundant Logs
- React StrictMode causes double rendering
- Multiple ErrorBoundary instances
- Verbose initialization logs

#### Solutions

##### 1. Disable StrictMode (Development Only)
```typescript
// Change from:
<StrictMode><App /></StrictMode>
// To:
<App />
```

##### 2. Clean Up Verbose Logs
```typescript
// Instead of:
console.log('🚀 [STARTUP] App.tsx - initializeApp starting...')
console.log('⏱️ [STARTUP] Starting Cache Manager...')
console.log('✅ [STARTUP] Cache Manager completed in 0ms')

// Use:
console.log('✅ Services initialized')
```

##### 3. Conditional Logging
```typescript
const DEBUG = localStorage.getItem('DEBUG_MODE') === 'true'
if (DEBUG) {
  console.log('Detailed debug info...')
}
```

### Port and Server Issues

#### Multiple Servers Running
```bash
# Kill all Node processes
pkill -f node

# Kill specific port
kill -9 $(lsof -t -i:5173)

# Clear Vite cache
rm -rf node_modules/.vite
```

#### WebSocket Connection Errors
- Usually caused by browser caching old port
- Solution: Close all tabs, clear cache, restart server

### Essential Debug Commands

```bash
# Check what's running
ps aux | grep node
lsof -i :5173

# Clear everything and restart
rm -rf node_modules/.vite dist
npm run dev

# Check for TypeScript errors
npx tsc --noEmit

# Check for ESLint issues
npm run lint
```

### Error Visibility Best Practices

1. **Always use ErrorBoundary**
   - Catches React component errors
   - Shows user-friendly error page

2. **Add try-catch in critical paths**
   ```typescript
   try {
     await initializeServices()
   } catch (error) {
     console.error('Init failed:', error)
     // Show error to user
   }
   ```

3. **Make errors visible**
   - Don't rely only on console
   - Show errors in UI during development
   - Use toast notifications for user errors

4. **Handle timeouts explicitly** (Added 2025-09-13)
   ```typescript
   const withTimeout = Promise.race([
     actualOperation(),
     new Promise((_, reject) => 
       setTimeout(() => reject(new Error('Timeout')), 60000)
     )
   ])
   ```

### Prevention Checklist

Before committing:
- [ ] Run `npm run build` - catches import errors
- [ ] Check all imports are present
- [ ] No duplicate exports
- [ ] Clear test files and logs
- [ ] Test in incognito window
- [ ] Verify catch blocks have return/throw
- [ ] Test with slow network (3G throttling)

### Key Learnings

1. **Silent failures are the worst** - Add visible error handlers
2. **TypeScript doesn't catch missing imports** in lazy-loaded components
3. **Browser cache causes confusion** - Always test in clean environment
4. **StrictMode doubles everything** - Consider disabling in development
5. **Build command reveals more errors** than dev mode
6. **Timeouts need explicit handling** - Backend may succeed after frontend timeout
7. **Control flow bugs are subtle** - Missing return in catch is common

### Quick Recovery Steps

When app won't load:
1. Check browser console
2. Run `npm run build` to find errors
3. Create minimal test component
4. Add global error handlers
5. Clear all caches and restart
6. Check for missing imports

When seeing inconsistent state (UI vs Database):
1. Check network timing with DevTools
2. Add detailed logging with timestamps
3. Verify control flow (returns in catch blocks)
4. Test with network throttling
5. Check for race conditions
6. Ensure data is always saved on error