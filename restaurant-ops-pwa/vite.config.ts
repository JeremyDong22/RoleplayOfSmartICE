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
        // Don't precache anything - let runtime caching handle important files
        globPatterns: [], // Empty - no precaching
        // Exclude all files from precaching
        globIgnores: ['**/*'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
        skipWaiting: false, // Don't auto-takeover
        clientsClaim: false, // Don't auto-claim clients
        cleanupOutdatedCaches: true, // Clean old caches
        runtimeCaching: [
          // Face recognition models - StaleWhileRevalidate for background updates
          {
            urlPattern: /\/models\/.*\.(bin|json)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'face-models-v3',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year max
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Task sample images - StaleWhileRevalidate for background updates
          {
            urlPattern: /\/task-samples\/.*\.(jpg|jpeg|png|webp)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'task-samples-v2',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days, will check for updates
              }
            }
          }
        ]
      }
    })
  ],
})
