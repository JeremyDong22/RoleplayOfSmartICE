// Configuration for Restaurant Operations PWA with service worker and manifest setup
// Updated to use existing SVG icons instead of non-existent PNG files
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
    strictPort: false,
    hmr: {
      overlay: true,
      protocol: 'ws',
      host: 'localhost',
      port: 5173
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
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg', 'icon.svg', 'icon-192x192.svg'],
      injectRegister: 'auto',
      manifest: {
        name: 'Restaurant Operations Management',
        short_name: 'RestOps',
        description: 'Restaurant operations management system with task tracking',
        theme_color: '#1976d2',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/icon-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: '/icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: '/icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // 添加模型文件到预缓存列表
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,bin,json}'],
        // Exclude large image files from precaching
        globIgnores: ['**/task-samples/**/*.jpg', '**/task-samples/**/*.jpeg'],
        // 提升到10MB以支持模型文件
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
        runtimeCaching: [
          // 人脸识别模型 - 缓存优先，永久保存
          {
            urlPattern: /\/models\/.*\.(bin|json)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'face-models-v1',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1年缓存
              },
              cacheableResponse: {
                statuses: [0, 200] // 支持跨域请求
              }
            }
          },
          {
            urlPattern: /^https:\/\/wdpeoyugsxqnpwwtkqsl\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              networkTimeoutSeconds: 5 // 5秒超时后使用缓存
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
