# PWA Automatic Update Guide

## Overview
This guide explains how the PWA automatic update system works and how to ensure your app updates properly when you deploy new versions.

## How It Works

### 1. Version Management
- Each build generates a unique version identifier (git commit hash or timestamp)
- The version is embedded in the service worker during build via `scripts/update-sw-version.js`
- Cache names include the version to ensure clean cache updates

### 2. Update Detection
- The app checks for updates every 30 seconds in production (5 seconds in dev)
- Service worker compares byte-by-byte with server version
- When a new version is detected, user sees an update notification

### 3. Update Process
- User clicks "立即更新" (Update Now) button
- Service worker calls `skipWaiting()` to activate immediately
- New service worker claims all clients via `clients.claim()`
- Page automatically reloads with new version

### 4. Cache Strategy
- Service worker files: No cache (always fresh)
- HTML files: No cache (always fresh)
- JavaScript/CSS: Versioned with hash (immutable)
- Images/Models: Long-term cache (30 days)

## Deployment Checklist

### Before Deployment
1. ✅ Ensure all changes are committed to git
2. ✅ Run `npm run build` to generate production build
3. ✅ Verify version is updated in `dist/sw.js`

### Server Configuration

#### Apache (.htaccess)
Already configured in `public/.htaccess`:
- Service worker: no-cache
- HTML files: no-cache
- Assets: appropriate cache headers

#### Vercel
Already configured in `vercel.json`:
- Proper cache headers for all file types
- Service worker never cached

#### Nginx
Add to your nginx config:
```nginx
location /sw.js {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
}

location ~* \.(html)$ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}

location /assets/ {
    add_header Cache-Control "max-age=31536000, immutable";
}
```

## Testing Updates

### Local Testing
1. Run `npm run build` to create production build
2. Run `npm run preview` to serve the build
3. Open app in browser and check console for version
4. Make a change to any file
5. Run `npm run build` again
6. Refresh the page - you should see update notification
7. Click "立即更新" to apply update

### Production Testing
1. Deploy version 1 to your server
2. Open app and note the version (shown in dev mode)
3. Make changes and deploy version 2
4. Wait 30 seconds or refresh page
5. Update notification should appear
6. Click update button to apply new version

## Troubleshooting

### Updates Not Detected
- Check browser DevTools > Application > Service Workers
- Verify service worker is registered and active
- Check Network tab - sw.js should have no-cache headers
- Clear browser cache and try again

### Update Notification Not Showing
- Check console for errors
- Verify UpdateNotification component is rendered in App.tsx
- Check service worker messages in console

### Page Not Reloading After Update
- Ensure `clients.claim()` is called in service worker
- Check for `controllerchange` event listener
- Manually reload if automatic reload fails

### Version Not Changing
- Verify git is installed and repository is initialized
- Check `scripts/update-sw-version.js` is running during build
- Look for version replacement in build output

## Best Practices

1. **Always test updates locally** before deploying to production
2. **Monitor console logs** for service worker lifecycle events
3. **Use version numbers** in your commit messages for easy tracking
4. **Clear CDN cache** if using CDN for faster propagation
5. **Educate users** about the update button functionality

## User Experience

When users see the update notification:
- **"发现新版本，是否立即更新？"** (New version found, update now?)
- **"稍后"** button: Dismisses notification, update applies on next visit
- **"立即更新"** button: Applies update immediately with page reload

The update process is designed to be:
- Non-intrusive (can be dismissed)
- Fast (immediate activation)
- Reliable (automatic fallback to reload)
- Transparent (version shown in dev mode)

## Development Mode

In development mode (`npm run dev`):
- Version indicator shows in bottom-right corner
- Update checks happen every 5 seconds
- Console logs show detailed update process
- Service worker updates more frequently

## Production Optimization

For production deployments:
- Ensure HTTP/2 is enabled for faster asset loading
- Use CDN for static assets with proper cache headers
- Enable gzip/brotli compression
- Monitor update success rate via analytics

## Related Files

- `/public/sw.js` - Main service worker file
- `/scripts/update-sw-version.js` - Version update script
- `/src/components/UpdateNotification.tsx` - Update UI component
- `/vercel.json` - Vercel deployment config
- `/public/.htaccess` - Apache server config
- `/vite.config.ts` - Vite PWA configuration