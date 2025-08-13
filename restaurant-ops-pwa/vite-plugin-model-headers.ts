// Vite plugin to set proper headers for face-api.js model files
// Fixes iOS Safari loading issues with model files

import type { Plugin } from 'vite'

export function modelHeaders(): Plugin {
  return {
    name: 'model-headers',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Check if this is a model file request
        if (req.url?.includes('/models/') && (
          req.url.includes('.bin') || 
          req.url.includes('.json') ||
          req.url.includes('manifest')
        )) {
          // Set proper headers for model files
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
          
          // For binary files, set proper content type
          if (req.url.includes('.bin')) {
            res.setHeader('Content-Type', 'application/octet-stream')
          }
        }
        next()
      })
    }
  }
}