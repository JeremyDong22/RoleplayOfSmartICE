// Global face model manager to ensure models are loaded only once
// Prevents multiple components from loading the same models simultaneously
// Updated: 2025-08-13 - Removed mobile-specific logic, added comprehensive logging

import * as faceapi from 'face-api.js'
import { IOSModelLoader } from './iOSModelLoader'
import { ManualModelLoader } from './manualModelLoader'

class FaceModelManager {
  private static instance: FaceModelManager
  private modelsLoaded = false
  private loadingPromise: Promise<void> | null = null
  private loadAttempts = 0
  private readonly MODEL_URL = '/models'
  private readonly MODEL_URL_ABSOLUTE = window.location.origin + '/models'
  private progressCallback: ((message: string, progress: number) => void) | null = null
  private isFetchIntercepted = false  // Global flag to prevent multiple interceptors
  private originalFetch: typeof fetch | null = null  // Store original fetch globally
  
  private constructor() {
    // Store the original fetch immediately on construction
    this.originalFetch = window.fetch
  }
  
  static getInstance(): FaceModelManager {
    if (!FaceModelManager.instance) {
      FaceModelManager.instance = new FaceModelManager()
    }
    return FaceModelManager.instance
  }
  
  // Set progress callback for UI updates
  setProgressCallback(callback: (message: string, progress: number) => void) {
    this.progressCallback = callback
    // Also set for ManualModelLoader
    ManualModelLoader.setProgressCallback((file, progress) => {
      callback(`正在加载模型文件: ${file}`, progress)
    })
  }
  
  // Device detection for logging purposes only
  private getDeviceInfo(): { ua: string, platform: string, vendor: string, isMobile: boolean } {
    const ua = navigator.userAgent
    const platform = navigator.platform
    const vendor = navigator.vendor
    const isMobile = /iPad|iPhone|iPod|Android/i.test(ua) || 
                     (ua.includes('Macintosh') && 'ontouchend' in document)
    
    return { ua, platform, vendor, isMobile }
  }
  
  // Get current model loading status
  getModelStatus(): {
    tinyFaceDetector: boolean
    faceLandmark68Net: boolean
    faceRecognitionNet: boolean
    allLoaded: boolean
  } {
    return {
      tinyFaceDetector: faceapi.nets.tinyFaceDetector.isLoaded,
      faceLandmark68Net: faceapi.nets.faceLandmark68Net.isLoaded,
      faceRecognitionNet: faceapi.nets.faceRecognitionNet.isLoaded,
      allLoaded: this.modelsLoaded
    }
  }
  
  // Main initialization method
  async initialize(): Promise<void> {
    // If already loaded, return immediately
    if (this.modelsLoaded) {
      console.log('[ModelManager] Models already loaded, skipping initialization')
      return
    }
    
    // If currently loading, return the existing promise
    if (this.loadingPromise) {
      console.log('[ModelManager] Models currently loading, waiting for existing promise')
      return this.loadingPromise
    }
    
    // Start new loading process
    this.loadingPromise = this.loadModels()
    
    try {
      await this.loadingPromise
    } finally {
      this.loadingPromise = null
    }
  }
  
  // Preload models in background (non-blocking)
  preloadInBackground(): void {
    if (this.modelsLoaded || this.loadingPromise) {
      return
    }
    
    const deviceInfo = this.getDeviceInfo()
    console.log('[ModelManager] Starting background preload...', deviceInfo)
    
    // Start loading but don't await
    this.initialize().catch(error => {
      console.error('[ModelManager] Background preload failed:', error, deviceInfo)
      // Don't throw - this is background loading
    })
  }
  
  // Initialize only essential models for fast start
  async initializeMinimal(): Promise<void> {
    if (faceapi.nets.tinyFaceDetector.isLoaded) {
      console.log('[ModelManager] Minimal models already loaded')
      return
    }
    
    try {
      console.log('[ModelManager] Loading minimal models for fast start...')
      
      // Only load TinyFaceDetector for basic detection
      await faceapi.nets.tinyFaceDetector.loadFromUri(this.MODEL_URL)
      console.log('[ModelManager] Minimal models loaded')
      
      // Load other models in background
      this.loadRemainingModelsInBackground()
    } catch (error) {
      console.error('[ModelManager] Failed to load minimal models:', error)
      throw error
    }
  }
  
  private loadRemainingModelsInBackground(): void {
    if (this.modelsLoaded) return
    
    const loadRemaining = async () => {
      try {
        if (!faceapi.nets.faceLandmark68Net.isLoaded) {
          console.log('[ModelManager] Background loading FaceLandmark68Net...')
          await faceapi.nets.faceLandmark68Net.loadFromUri(this.MODEL_URL)
        }
        
        if (!faceapi.nets.faceRecognitionNet.isLoaded) {
          console.log('[ModelManager] Background loading FaceRecognitionNet...')
          // Use simple loading without fetch interceptor for background loads
          await faceapi.nets.faceRecognitionNet.loadFromUri(this.MODEL_URL)
        }
        
        this.modelsLoaded = true
        console.log('[ModelManager] All models loaded in background')
      } catch (error) {
        console.error('[ModelManager] Background loading failed:', error)
      }
    }
    
    // Start background loading
    loadRemaining()
  }
  
  private async loadModels(): Promise<void> {
    const startTime = performance.now()
    const deviceInfo = this.getDeviceInfo()
    
    try {
      this.loadAttempts++
      
      console.log(`[ModelManager] =====  MODEL LOADING START =====`)
      console.log(`[ModelManager] Attempt: ${this.loadAttempts}`)
      console.log(`[ModelManager] Device Info:`, deviceInfo)
      console.log(`[ModelManager] Model URL: ${this.MODEL_URL}`)
      console.log(`[ModelManager] Window location: ${window.location.origin}`)
      
      // Check current status
      const status = this.getModelStatus()
      console.log('[ModelManager] Current model status:', status)
      
      // If all models are already loaded, just mark as complete
      if (status.tinyFaceDetector && status.faceLandmark68Net && status.faceRecognitionNet) {
        console.log('[ModelManager] All models already loaded by face-api.js')
        this.modelsLoaded = true
        return
      }
      
      // Always use parallel loading for all devices
      console.log('[ModelManager] Using unified parallel loading strategy...')
      if (this.progressCallback) {
        this.progressCallback('正在加载人脸识别模型...', 0)
      }
      
      await this.loadModelsInParallel()
      
      // Verify all models are loaded
      const finalStatus = this.getModelStatus()
      const loadTime = performance.now() - startTime
      
      if (finalStatus.tinyFaceDetector && finalStatus.faceLandmark68Net && finalStatus.faceRecognitionNet) {
        this.modelsLoaded = true
        console.log('[ModelManager] ✅ All models loaded successfully')
        console.log(`[ModelManager] Total load time: ${loadTime.toFixed(0)}ms`)
        console.log('[ModelManager] ===== MODEL LOADING END =====')
        
        if (this.progressCallback) {
          this.progressCallback('模型加载完成', 100)
        }
      } else {
        throw new Error('Some models failed to load: ' + JSON.stringify(finalStatus))
      }
      
    } catch (error) {
      const loadTime = performance.now() - startTime
      console.error('[ModelManager] ===== MODEL LOADING FAILED =====')
      console.error('[ModelManager] Error:', error)
      console.error('[ModelManager] Failed after:', `${loadTime.toFixed(0)}ms`)
      console.error('[ModelManager] Device info:', deviceInfo)
      console.error('[ModelManager] Error stack:', (error as Error).stack)
      
      // Log network details if available
      if ('connection' in navigator) {
        console.error('[ModelManager] Network info:', (navigator as any).connection)
      }
      
      // Provide user-friendly error messages
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('Load failed')) {
          throw new Error('无法加载人脸识别模型，请检查网络连接并刷新页面')
        } else if (error.message.includes('WebGL')) {
          throw new Error('您的设备不支持WebGL，无法使用人脸识别功能')
        }
      }
      throw new Error('模型加载失败，请刷新页面重试')
    }
  }
  
  private async loadModelsSequentially(): Promise<void> {
    console.log('[ModelManager] Using sequential loading (fallback strategy)')
    
    // Load TinyFaceDetector
    if (!faceapi.nets.tinyFaceDetector.isLoaded) {
      console.log('[ModelManager] Loading TinyFaceDetector...')
      await this.loadModelWithRetrySimple(
        () => faceapi.nets.tinyFaceDetector.loadFromUri(this.MODEL_URL),
        'TinyFaceDetector',
        3
      )
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    
    // Load FaceLandmark68Net  
    if (!faceapi.nets.faceLandmark68Net.isLoaded) {
      console.log('[ModelManager] Loading FaceLandmark68Net...')
      await this.loadModelWithRetrySimple(
        () => faceapi.nets.faceLandmark68Net.loadFromUri(this.MODEL_URL),
        'FaceLandmark68Net',
        3
      )
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    
    // Load FaceRecognitionNet (largest)
    if (!faceapi.nets.faceRecognitionNet.isLoaded) {
      console.log('[ModelManager] Loading FaceRecognitionNet...')
      await this.loadModelWithRetrySimple(
        () => faceapi.nets.faceRecognitionNet.loadFromUri(this.MODEL_URL),
        'FaceRecognitionNet',
        3
      )
    }
  }
  
  private async loadModelsInParallel(): Promise<void> {
    console.log('[ModelManager] Using parallel loading')
    const loadStartTime = performance.now()
    
    // Use a single global interceptor for all parallel loads
    let globalFetchCount = 0
    
    if (!this.isFetchIntercepted && this.originalFetch) {
      this.isFetchIntercepted = true
      const savedOriginalFetch = this.originalFetch
      
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input.toString()
        
        // Only log model-related fetches
        if (url.includes('/models/')) {
          globalFetchCount++
          console.log(`[ModelManager] Model fetch #${globalFetchCount}: ${url}`)
          
          try {
            const response = await savedOriginalFetch(input, init)
            console.log(`[ModelManager] Model fetch #${globalFetchCount} response:`, {
              status: response.status,
              ok: response.ok
            })
            return response
          } catch (fetchError) {
            console.error(`[ModelManager] Model fetch #${globalFetchCount} error:`, fetchError)
            throw fetchError
          }
        } else {
          // For non-model fetches, just pass through without logging
          return savedOriginalFetch(input, init)
        }
      }
    }
    
    const modelsToLoad = []
    
    try {
      if (!faceapi.nets.tinyFaceDetector.isLoaded) {
        console.log('[ModelManager] Queueing TinyFaceDetector for loading...')
        modelsToLoad.push(
          this.loadModelWithRetrySimple(
            () => faceapi.nets.tinyFaceDetector.loadFromUri(this.MODEL_URL),
            'TinyFaceDetector'
          )
        )
      }
      
      if (!faceapi.nets.faceLandmark68Net.isLoaded) {
        console.log('[ModelManager] Queueing FaceLandmark68Net for loading...')
        modelsToLoad.push(
          this.loadModelWithRetrySimple(
            () => faceapi.nets.faceLandmark68Net.loadFromUri(this.MODEL_URL),
            'FaceLandmark68Net'
          )
        )
      }
      
      if (!faceapi.nets.faceRecognitionNet.isLoaded) {
        console.log('[ModelManager] Queueing FaceRecognitionNet for loading...')
        modelsToLoad.push(
          this.loadModelWithRetrySimple(
            () => faceapi.nets.faceRecognitionNet.loadFromUri(this.MODEL_URL),
            'FaceRecognitionNet'
          )
        )
      }
      
      if (modelsToLoad.length > 0) {
        console.log(`[ModelManager] Starting parallel load of ${modelsToLoad.length} models...`)
        await Promise.all(modelsToLoad)
        const parallelTime = performance.now() - loadStartTime
        console.log(`[ModelManager] Parallel loading completed in ${parallelTime.toFixed(0)}ms`)
      } else {
        console.log('[ModelManager] No models to load')
      }
    } finally {
      // Always restore original fetch
      if (this.isFetchIntercepted && this.originalFetch) {
        window.fetch = this.originalFetch
        this.isFetchIntercepted = false
        console.log('[ModelManager] Fetch interceptor removed')
      }
    }
  }
  
  // Simplified version without its own fetch interceptor for parallel loading
  private async loadModelWithRetrySimple(
    loadFn: () => Promise<void>,
    modelName: string,
    maxRetries: number = 3
  ): Promise<void> {
    let lastError: Error | null = null
    const modelStartTime = performance.now()
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const attemptStartTime = performance.now()
      
      try {
        console.log(`[ModelManager] Loading ${modelName} (attempt ${attempt}/${maxRetries})`)
        await loadFn()
        
        const attemptTime = performance.now() - attemptStartTime
        const totalTime = performance.now() - modelStartTime
        console.log(`[ModelManager] ✅ ${modelName} loaded successfully`)
        console.log(`[ModelManager] [${modelName}] Attempt time: ${attemptTime.toFixed(0)}ms, Total time: ${totalTime.toFixed(0)}ms`)
        
        if (this.progressCallback) {
          const progress = modelName === 'TinyFaceDetector' ? 33 :
                          modelName === 'FaceLandmark68Net' ? 66 : 100
          this.progressCallback(`已加载 ${modelName}`, progress)
        }
        
        return
      } catch (error: any) {
        lastError = error as Error
        const attemptTime = performance.now() - attemptStartTime
        
        console.error(`[ModelManager] ❌ Failed to load ${modelName} (attempt ${attempt}):`, {
          error: error,
          message: error?.message,
          attemptTime: `${attemptTime.toFixed(0)}ms`
        })
        
        if (attempt < maxRetries) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
          console.log(`[ModelManager] Waiting ${waitTime}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      }
    }
    
    // All retries failed
    const totalTime = performance.now() - modelStartTime
    console.error(`[ModelManager] ❌❌❌ Failed to load ${modelName} after ${maxRetries} attempts, total time: ${totalTime.toFixed(0)}ms`)
    throw lastError || new Error(`Failed to load ${modelName} after ${maxRetries} attempts`)
  }
  
  private async loadModelWithRetry(
    loadFn: () => Promise<void>,
    modelName: string,
    maxRetries: number = 3
  ): Promise<void> {
    let lastError: Error | null = null
    const modelStartTime = performance.now()
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const attemptStartTime = performance.now()
      const originalFetch = window.fetch
      let fetchCount = 0
      
      try {
        console.log(`[ModelManager] Loading ${modelName} (attempt ${attempt}/${maxRetries})`)
        console.log(`[ModelManager] URL: ${this.MODEL_URL}/${modelName.toLowerCase()}_model-*`)
        
        // Add request interceptor to log fetch details
        // Only intercept model-related fetches
        window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = typeof input === 'string' ? input : input.toString()
          
          // Only log model-related fetches
          if (url.includes('/models/')) {
            fetchCount++
            console.log(`[ModelManager] [${modelName}] Fetch #${fetchCount}: ${url}`)
            
            try {
              const response = await originalFetch(input, init)
              console.log(`[ModelManager] [${modelName}] Fetch #${fetchCount} response:`, {
                status: response.status,
                ok: response.ok,
                headers: response.headers.get('content-type'),
                size: response.headers.get('content-length')
              })
              return response
            } catch (fetchError) {
              console.error(`[ModelManager] [${modelName}] Fetch #${fetchCount} error:`, fetchError)
              throw fetchError
            }
          } else {
            // For non-model fetches, just pass through without logging
            return originalFetch(input, init)
          }
        }
        
        await loadFn()
        
        const attemptTime = performance.now() - attemptStartTime
        const totalTime = performance.now() - modelStartTime
        console.log(`[ModelManager] ✅ ${modelName} loaded successfully`)
        console.log(`[ModelManager] [${modelName}] Attempt time: ${attemptTime.toFixed(0)}ms, Total time: ${totalTime.toFixed(0)}ms`)
        
        if (this.progressCallback) {
          const progress = modelName === 'TinyFaceDetector' ? 33 :
                          modelName === 'FaceLandmark68Net' ? 66 : 100
          this.progressCallback(`已加载 ${modelName}`, progress)
        }
        
        return
      } catch (error: any) {
        lastError = error as Error
        const attemptTime = performance.now() - attemptStartTime
        
        console.error(`[ModelManager] ❌ Failed to load ${modelName} (attempt ${attempt}):`, {
          error: error,
          message: error?.message,
          stack: error?.stack,
          attemptTime: `${attemptTime.toFixed(0)}ms`
        })
        
        if (attempt < maxRetries) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
          console.log(`[ModelManager] Waiting ${waitTime}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      } finally {
        // ALWAYS restore original fetch, whether success or error
        window.fetch = originalFetch
      }
    }
    
    // All retries failed
    const totalTime = performance.now() - modelStartTime
    console.error(`[ModelManager] ❌❌❌ Failed to load ${modelName} after ${maxRetries} attempts, total time: ${totalTime.toFixed(0)}ms`)
    throw lastError || new Error(`Failed to load ${modelName} after ${maxRetries} attempts`)
  }
  
  // Alternative loading approach (removed iOS-specific logic)
  private async loadModelsWithAlternativeApproach(): Promise<void> {
    console.log('[ModelManager] Using alternative loading approach (last resort)...')
    
    // Try loading models one by one with custom fetch settings
    const models = [
      { name: 'TinyFaceDetector', loader: () => faceapi.nets.tinyFaceDetector },
      { name: 'FaceLandmark68Net', loader: () => faceapi.nets.faceLandmark68Net },
      { name: 'FaceRecognitionNet', loader: () => faceapi.nets.faceRecognitionNet }
    ]
    
    for (const model of models) {
      const net = model.loader()
      if (net.isLoaded) {
        console.log(`[ModelManager] ${model.name} already loaded`)
        continue
      }
      
      console.log(`[ModelManager] Loading ${model.name} with alternative approach...`)
      
      try {
        // Use a custom fetch with specific headers
        const originalFetch = window.fetch
        window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = typeof input === 'string' ? input : input.toString()
          console.log(`[ModelManager] [Alt] Fetching: ${url}`)
          
          if (url.includes('/models/')) {
            // Add specific headers for model files
            init = {
              ...init,
              mode: 'cors',
              cache: 'default',
              credentials: 'same-origin',
              headers: {
                ...((init?.headers as any) || {}),
                'Accept': 'application/octet-stream, application/json, */*'
              }
            }
          }
          return originalFetch(input, init)
        }
        
        await net.loadFromUri(this.MODEL_URL)
        
        // Restore original fetch
        window.fetch = originalFetch
        
        console.log(`[ModelManager] ✅ ${model.name} loaded with alternative approach`)
        
        // Small delay between models
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`[ModelManager] Failed to load ${model.name} with alternative approach:`, error)
        // Continue trying to load other models
      }
    }
  }
  
  // Ensure fetch is restored (safety mechanism)
  private ensureFetchRestored(): void {
    if (this.isFetchIntercepted && this.originalFetch) {
      console.warn('[ModelManager] Restoring fetch that was left intercepted')
      window.fetch = this.originalFetch
      this.isFetchIntercepted = false
    }
  }
  
  // Force reload models (useful for error recovery)
  async forceReload(): Promise<void> {
    console.log('[ModelManager] Force reloading models...')
    this.ensureFetchRestored() // Ensure fetch is clean before reload
    this.modelsLoaded = false
    this.loadingPromise = null
    this.loadAttempts = 0
    await this.initialize()
  }
  
  // Check if models are ready
  isReady(): boolean {
    return this.modelsLoaded
  }
}

// Export singleton instance
export const faceModelManager = FaceModelManager.getInstance()