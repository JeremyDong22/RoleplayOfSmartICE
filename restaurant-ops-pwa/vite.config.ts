// Configuration for Restaurant Operations with optimized service worker
// Updated: 2025-01-24 - Removed PWA manifest, kept essential caching only
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { modelHeaders } from './vite-plugin-model-headers'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  server: {
    https: false,
    port: 5173,
    strictPort: true,
    host: true,
    hmr: {
      overlay: false,
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
      clientPort: 5173
    },
    // 允许模型文件缓存，但其他文件禁用缓存
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
    // 配置静态文件服务
    fs: {
      allow: ['..']
    }
  },
  // 为模型文件设置特殊的构建配置
  publicDir: 'public',
  build: {
    assetsInlineLimit: 0 // 不内联任何资源
  },
  plugins: [
    react(),
    modelHeaders(), // Add custom headers for model files
    VitePWA({
      registerType: 'prompt', // User controls updates
      injectRegister: 'auto',
      manifest: false, // Disable PWA installation
      workbox: {
        // Only precache essential static assets
        globPatterns: ['**/*.{ico,svg,woff,woff2}'], // Only fonts and icons
        // Exclude all other files from precaching
        globIgnores: ['**/*.{js,css,html,json,jpg,jpeg,png,webp}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
        skipWaiting: false, // Don't auto-takeover
        clientsClaim: false, // Don't auto-claim clients
        cleanupOutdatedCaches: true, // Clean old caches
        runtimeCaching: [
          // Face recognition models - permanent cache (never changes)
          {
            urlPattern: /\/models\/.*\.(bin|json)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'face-models-permanent',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year cache
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Cache task sample images at runtime instead of precaching
          {
            urlPattern: /\/task-samples\/.*\.(jpg|jpeg|png|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'task-samples-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      }
    })
  ],
})
