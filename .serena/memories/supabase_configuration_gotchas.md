# Supabase Configuration Critical Issues and Solutions

## Date: 2025-09-12
## Author: Claude

## Critical Issue: Global Content-Type Header Override

### Problem
**Global headers in Supabase client configuration can break storage uploads**

When initializing the Supabase client with global headers like:
```typescript
global: {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
}
```

This causes ALL requests to Supabase (including file uploads) to be sent with `Content-Type: application/json`, resulting in:
- Error: "mime type application/json is not supported"
- HTTP 400 Bad Request on storage uploads
- Photos, audio, and other files fail to upload

### Root Cause
The global Content-Type header overrides the automatic content type detection that Supabase normally performs for different request types.

### Solution
**Remove Content-Type and Accept from global headers**:
```typescript
// ✅ CORRECT - Let Supabase handle content types
global: {
  headers: {
    'x-client-info': 'restaurant-ops-pwa'
    // NO Content-Type or Accept headers here
  }
}
```

### Why This Works
Supabase client automatically sets appropriate headers:
- Storage uploads → Based on file MIME type (image/jpeg, audio/mp3, etc.)
- Database queries → application/json
- Auth requests → application/json

## File Location
- `/src/services/supabase.ts` - Main Supabase client configuration

## Symptoms of This Issue
1. File uploads fail with "mime type application/json is not supported"
2. Blob/File objects seem correct but still fail
3. Various workarounds (ArrayBuffer, File, Blob) don't fix it
4. contentType option in upload() is ignored

## Testing After Fix
1. Photo uploads should work immediately
2. Database queries continue working normally
3. Authentication continues working normally
4. No need to restart the dev server (Vite hot-reloads)

## Prevention
- Never set Content-Type globally in Supabase client
- Use request-specific headers when needed
- Let Supabase handle content type detection

## Related Issues
- GitHub: supabase/storage#43
- GitHub Discussion: supabase#34982
- Multiple Stack Overflow reports of same issue