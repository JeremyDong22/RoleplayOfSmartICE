// Manual model loader for iOS Safari
// Completely bypasses face-api.js's loader to avoid iOS issues
// Updated: 2025-08-13 - Improved timeout handling and retry logic for iPad network issues

import * as faceapi from 'face-api.js'

export class ManualModelLoader {
  private static modelCache = new Map<string, ArrayBuffer>()
  private static loadingProgress = new Map<string, number>()
  private static onProgressCallback: ((file: string, progress: number) => void) | null = null
  
  // Set progress callback
  static setProgressCallback(callback: (file: string, progress: number) => void) {
    this.onProgressCallback = callback
  }
  
  // Pre-fetch all model files into memory with retry logic
  static async prefetchModels(basePath: string, maxRetries: number = 3): Promise<void> {
    console.log('[ManualModelLoader] Starting model pre-fetch...')
    
    const modelFiles = [
      // TinyFaceDetector (smallest, load first)
      { name: 'tiny_face_detector_model-weights_manifest.json', size: 3000 },
      { name: 'tiny_face_detector_model-shard1.bin', size: 330000 },
      // FaceLandmark68Net (medium)
      { name: 'face_landmark_68_model-weights_manifest.json', size: 8000 },
      { name: 'face_landmark_68_model-shard1.bin', size: 360000 },
      // FaceRecognitionNet (largest, load last)
      { name: 'face_recognition_model-weights_manifest.json', size: 18000 },
      { name: 'face_recognition_model-shard1.bin', size: 3200000 },
      { name: 'face_recognition_model-shard2.bin', size: 3000000 }
    ]
    
    // Load files sequentially for better reliability on slow connections
    for (const fileInfo of modelFiles) {
      const url = `${basePath}/${fileInfo.name}`
      let lastError: Error | null = null
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[ManualModelLoader] Fetching ${fileInfo.name} (attempt ${attempt}/${maxRetries})...`)
          
          // Use different timeout based on file size
          const timeout = Math.max(30000, fileInfo.size / 10) // At least 30s, or size/10 ms
          
          const buffer = await this.fetchWithXHRAndProgress(url, fileInfo.name, timeout)
          this.modelCache.set(fileInfo.name, buffer)
          
          console.log(`[ManualModelLoader] ✅ Cached ${fileInfo.name} (${buffer.byteLength} bytes)`)
          break // Success, move to next file
          
        } catch (error) {
          lastError = error as Error
          console.error(`[ManualModelLoader] Attempt ${attempt} failed for ${fileInfo.name}:`, error)
          
          if (attempt < maxRetries) {
            // Wait before retry with exponential backoff
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
            console.log(`[ManualModelLoader] Waiting ${delay}ms before retry...`)
            await new Promise(resolve => setTimeout(resolve, delay))
          }
        }
      }
      
      // If all retries failed for this file, log but continue with other files
      if (lastError) {
        console.error(`[ManualModelLoader] Failed to load ${fileInfo.name} after ${maxRetries} attempts`)
      }
    }
    
    console.log('[ManualModelLoader] Pre-fetch complete')
  }
  
  // Use XMLHttpRequest with progress tracking and better error handling
  private static fetchWithXHRAndProgress(url: string, fileName: string, timeout: number = 60000): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('GET', url, true)
      xhr.responseType = 'arraybuffer'
      
      // For iOS, disable cache to avoid stale responses
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
        xhr.setRequestHeader('Pragma', 'no-cache')
      }
      
      let lastProgress = 0
      let progressStallTimer: NodeJS.Timeout | null = null
      
      // Track progress with stall detection
      xhr.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100
          this.loadingProgress.set(fileName, progress)
          if (this.onProgressCallback) {
            this.onProgressCallback(fileName, progress)
          }
          
          // Reset stall timer on progress
          if (progressStallTimer) clearTimeout(progressStallTimer)
          lastProgress = progress
          
          // Set new stall timer (15 seconds without progress = stalled)
          if (progress < 100) {
            progressStallTimer = setTimeout(() => {
              xhr.abort()
              reject(new Error(`Download stalled at ${Math.round(lastProgress)}%`))
            }, 15000)
          }
        }
      }
      
      xhr.onload = () => {
        if (progressStallTimer) clearTimeout(progressStallTimer)
        
        if (xhr.status === 200) {
          this.loadingProgress.set(fileName, 100)
          if (this.onProgressCallback) {
            this.onProgressCallback(fileName, 100)
          }
          resolve(xhr.response)
        } else if (xhr.status === 0) {
          // Status 0 usually means network error or CORS issue
          reject(new Error('Network connection lost or CORS error'))
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`))
        }
      }
      
      xhr.onerror = () => {
        if (progressStallTimer) clearTimeout(progressStallTimer)
        reject(new Error('Network error - please check your connection'))
      }
      
      xhr.ontimeout = () => {
        if (progressStallTimer) clearTimeout(progressStallTimer)
        reject(new Error(`Request timeout after ${timeout}ms`))
      }
      
      xhr.timeout = timeout
      
      try {
        xhr.send()
      } catch (e) {
        if (progressStallTimer) clearTimeout(progressStallTimer)
        reject(new Error('Failed to send request: ' + (e as Error).message))
      }
    })
  }
  
  // Use XMLHttpRequest instead of fetch for iOS (backward compatibility)
  private static fetchWithXHR(url: string): Promise<ArrayBuffer> {
    return this.fetchWithXHRAndProgress(url, url.split('/').pop() || 'unknown', 30000)
  }
  
  // Load models from cache
  static async loadFromCache(basePath: string): Promise<void> {
    console.log('[ManualModelLoader] Loading models from cache...')
    
    // First ensure we have the cache
    if (this.modelCache.size === 0) {
      console.log('[ManualModelLoader] Cache empty, pre-fetching first...')
      await this.prefetchModels(basePath)
    }
    
    try {
      // Load TinyFaceDetector
      if (!faceapi.nets.tinyFaceDetector.isLoaded) {
        await this.loadTinyFaceDetector()
      }
      
      // Load FaceLandmark68Net
      if (!faceapi.nets.faceLandmark68Net.isLoaded) {
        await this.loadFaceLandmark68Net()
      }
      
      // Load FaceRecognitionNet
      if (!faceapi.nets.faceRecognitionNet.isLoaded) {
        await this.loadFaceRecognitionNet()
      }
      
      console.log('[ManualModelLoader] ✅ All models loaded from cache')
    } catch (error) {
      console.error('[ManualModelLoader] Failed to load from cache:', error)
      throw error
    }
  }
  
  private static async loadTinyFaceDetector(): Promise<void> {
    console.log('[ManualModelLoader] Loading TinyFaceDetector from cache...')
    
    const manifestBuffer = this.modelCache.get('tiny_face_detector_model-weights_manifest.json')
    const weightsBuffer = this.modelCache.get('tiny_face_detector_model-shard1.bin')
    
    if (!manifestBuffer || !weightsBuffer) {
      throw new Error('TinyFaceDetector files not in cache')
    }
    
    // Parse manifest
    const manifestText = new TextDecoder().decode(manifestBuffer)
    const manifest = JSON.parse(manifestText)
    
    // Create weight map
    const weightMap: any = {}
    for (const group of manifest) {
      for (const weight of group.weights) {
        const tensor = faceapi.tf.tensor(
          new Float32Array(weightsBuffer.slice(weight.offset, weight.offset + weight.size)),
          weight.shape,
          weight.dtype
        )
        weightMap[weight.name] = tensor
      }
    }
    
    // Load into model
    await faceapi.nets.tinyFaceDetector.load(weightMap)
    console.log('[ManualModelLoader] ✅ TinyFaceDetector loaded')
  }
  
  private static async loadFaceLandmark68Net(): Promise<void> {
    console.log('[ManualModelLoader] Loading FaceLandmark68Net from cache...')
    
    const manifestBuffer = this.modelCache.get('face_landmark_68_model-weights_manifest.json')
    const weightsBuffer = this.modelCache.get('face_landmark_68_model-shard1.bin')
    
    if (!manifestBuffer || !weightsBuffer) {
      throw new Error('FaceLandmark68Net files not in cache')
    }
    
    // For this model, we can try to use the standard loader with our cached data
    // Convert ArrayBuffer to Blob URL for face-api.js
    const blob = new Blob([weightsBuffer], { type: 'application/octet-stream' })
    const blobUrl = URL.createObjectURL(blob)
    
    try {
      // Override fetch temporarily
      const originalFetch = window.fetch
      window.fetch = async (input: any) => {
        if (input.includes('face_landmark_68')) {
          if (input.includes('manifest')) {
            return new Response(manifestBuffer)
          } else {
            return new Response(weightsBuffer)
          }
        }
        return originalFetch(input)
      }
      
      // Load using standard loader
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models')
      
      // Restore fetch
      window.fetch = originalFetch
      
      console.log('[ManualModelLoader] ✅ FaceLandmark68Net loaded')
    } finally {
      URL.revokeObjectURL(blobUrl)
    }
  }
  
  private static async loadFaceRecognitionNet(): Promise<void> {
    console.log('[ManualModelLoader] Loading FaceRecognitionNet from cache...')
    
    const manifestBuffer = this.modelCache.get('face_recognition_model-weights_manifest.json')
    const shard1Buffer = this.modelCache.get('face_recognition_model-shard1.bin')
    const shard2Buffer = this.modelCache.get('face_recognition_model-shard2.bin')
    
    if (!manifestBuffer || !shard1Buffer || !shard2Buffer) {
      throw new Error('FaceRecognitionNet files not in cache')
    }
    
    // Override fetch to serve from cache
    const originalFetch = window.fetch
    window.fetch = async (input: any) => {
      if (typeof input === 'string') {
        if (input.includes('face_recognition_model')) {
          if (input.includes('manifest')) {
            return new Response(manifestBuffer)
          } else if (input.includes('shard1')) {
            return new Response(shard1Buffer)
          } else if (input.includes('shard2')) {
            return new Response(shard2Buffer)
          }
        }
      }
      return originalFetch(input)
    }
    
    try {
      // Load using standard loader with our cached data
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models')
      console.log('[ManualModelLoader] ✅ FaceRecognitionNet loaded')
    } finally {
      // Restore fetch
      window.fetch = originalFetch
    }
  }
}