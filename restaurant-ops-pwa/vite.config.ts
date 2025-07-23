// Configuration for Restaurant Operations PWA with service worker and manifest setup
// Updated to use existing SVG icons instead of non-existent PNG files
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  server: {
    hmr: {
      port: 5173,
      host: 'localhost'
    }
  },
  plugins: [
    react(),
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/wdpeoyugsxqnpwwtkqsl\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              }
            }
          }
        ]
      }
    })
  ],
})
