# Vercel Cache Headers Configuration Research (2025)

## Overview
This document provides comprehensive guidance on configuring cache headers in Vercel deployment settings, based on the latest 2025 practices and your existing configuration.

## Current Project Configuration Analysis

Your project already has a good cache configuration foundation in `/Users/jeremydong/Desktop/Smartice/RoleplayOfSmartICE/vercel.json`:

```json
{
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    },
    {
      "source": "/(.*).html",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    },
    {
      "source": "/manifest.json",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "max-age=3600"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/models/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

## 1. vercel.json Headers Configuration

### Basic Structure
```json
{
  "headers": [
    {
      "source": "/path/pattern",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "cache-directive"
        }
      ]
    }
  ]
}
```

### Three Types of Cache Control Headers (2025)
1. **Cache-Control**: Standard browser caching
2. **CDN-Cache-Control**: Controls CDN caching behavior
3. **Vercel-CDN-Cache-Control**: Vercel-specific edge cache control

### Priority Order
Function headers > vercel.json config > next.config.js

## 2. Next.js Apps on Vercel Cache Configuration

### Headers in next.config.js
```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 's-maxage=86400, stale-while-revalidate'
          }
        ]
      }
    ]
  }
}
```

### Route Handler Cache Headers
```javascript
export async function GET() {
  return new Response('Hello World', {
    headers: {
      'Cache-Control': 'max-age=3600, s-maxage=86400',
      'CDN-Cache-Control': 'max-age=86400',
      'Vercel-CDN-Cache-Control': 'max-age=86400'
    }
  })
}
```

## 3. Vercel Edge Network Caching Behavior

### Default Behavior
- Static files: Cached for 31 days at edge
- Dynamic content: Not cached by default
- Browser cache: `public, max-age=0, must-revalidate` (prevents browser caching)

### Edge Cache Features
- Global distribution
- Automatic cache invalidation on deployment
- Manual cache purging available
- Supports stale-while-revalidate

## 4. Cache-Control Header Configuration Examples

### Static Assets (Recommended)
```json
{
  "source": "/(.*)\.(js|css|jpg|jpeg|gif|png|svg|woff2)",
  "headers": [
    {
      "key": "Cache-Control",
      "value": "public, max-age=31536000, immutable"
    }
  ]
}
```

### HTML Files
```json
{
  "source": "/(.*)\.(html)",
  "headers": [
    {
      "key": "Cache-Control",
      "value": "public, max-age=0, s-maxage=86400, must-revalidate"
    }
  ]
}
```

### API Routes
```json
{
  "source": "/api/(.*)",
  "headers": [
    {
      "key": "Cache-Control",
      "value": "s-maxage=60, stale-while-revalidate=300"
    }
  ]
}
```

## 5. Static Asset Caching Best Practices

### File Type Categories
```json
{
  "headers": [
    {
      "source": "/(.*)\.(jpg|jpeg|png|gif|svg|webp|ico)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)\.(js|css)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=86400, s-maxage=31536000"
        }
      ]
    },
    {
      "source": "/(.*)\.(woff|woff2|ttf|eot)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

## 6. API Route Caching Strategies

### Stale-While-Revalidate Pattern
```javascript
export async function GET() {
  const data = await fetchData()
  
  return Response.json(data, {
    headers: {
      'Cache-Control': 's-maxage=60, stale-while-revalidate=300'
    }
  })
}
```

### Tag-Based Invalidation
```javascript
import { revalidateTag } from 'next/cache'

export async function POST() {
  // Update data
  revalidateTag('posts')
  return Response.json({ revalidated: true })
}
```

## 7. ISR (Incremental Static Regeneration) Cache Implications

### Page-Level ISR
```javascript
export const revalidate = 3600 // Revalidate every hour

export default function Page({ data }) {
  return <div>{data.content}</div>
}
```

### Cache Headers Generated by ISR
- `Cache-Control: s-maxage=1, stale-while-revalidate=59`
- Automatically handles cache invalidation
- Background regeneration

## 8. CDN Cache Purging and Invalidation

### Manual Purging
```bash
vercel cache purge --type=cdn
```

### Programmatic Invalidation (Next.js)
```javascript
import { revalidatePath, revalidateTag } from 'next/cache'

// Revalidate specific path
revalidatePath('/posts/[slug]', 'page')

// Revalidate by tag
revalidateTag('posts')
```

### Cache Tags Setup
```javascript
fetch('https://api.example.com/data', {
  next: { tags: ['posts', 'featured'] }
})
```

## 9. Best Practices for Vercel Cache Configuration

### Security Headers
```json
{
  "source": "/(.*)",
  "headers": [
    {
      "key": "X-Content-Type-Options",
      "value": "nosniff"
    },
    {
      "key": "X-Frame-Options",
      "value": "DENY"
    }
  ]
}
```

### CORS with Caching
```json
{
  "source": "/api/(.*)",
  "headers": [
    {
      "key": "Access-Control-Allow-Origin",
      "value": "*"
    },
    {
      "key": "Cache-Control",
      "value": "s-maxage=300, stale-while-revalidate=600"
    }
  ]
}
```

## 10. Common Cache Header Patterns by File Type

### Complete Example Configuration
```json
{
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    },
    {
      "source": "/(.*)\.(html)$",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, s-maxage=86400, must-revalidate"
        }
      ]
    },
    {
      "source": "/manifest.json",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600"
        }
      ]
    },
    {
      "source": "/(.*)\.(js|css)$",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=86400, s-maxage=31536000"
        }
      ]
    },
    {
      "source": "/(.*)\.(jpg|jpeg|png|gif|svg|webp|ico)$",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)\.(woff|woff2|ttf|eot)$",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "s-maxage=60, stale-while-revalidate=300"
        }
      ]
    }
  ]
}
```

## Key Improvements for Your Current Configuration

1. **Add specific patterns for different asset types** instead of broad `/assets/(.*)` pattern
2. **Implement stale-while-revalidate** for dynamic content
3. **Consider adding CDN-Cache-Control** for more granular control
4. **Add cache headers for API routes** if you have any
5. **Implement tag-based invalidation** for content updates

## 2025 Updates Summary

- Enhanced support for `CDN-Cache-Control` and `Vercel-CDN-Cache-Control` headers
- Improved ISR with tag-based revalidation
- Better edge cache control and manual purging capabilities
- Automatic cache invalidation on deployments
- Support for stale-while-revalidate patterns across all asset types