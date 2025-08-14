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
    // Ensure fetch is clean before starting
    this.ensureFetchRestored()
    
    // If already loaded, return immediately
    if (this.modelsLoaded) {
      return
    }
    
    // If currently loading, return the existing promise
    if (this.loadingPromise) {
      return this.loadingPromise
    }
    
    // Start new loading process
    this.loadingPromise = this.loadModels()
    
    try {
      await this.loadingPromise
    } finally {
      this.loadingPromise = null
      this.ensureFetchRestored() // Extra safety: ensure fetch is restored after loading
    }
  }
  
  // Preload models in background (non-blocking)
  preloadInBackground(): void {
    if (this.modelsLoaded || this.loadingPromise) {
      return
    }
    
    const deviceInfo = this.getDeviceInfo()
    
    // Start loading but don't await
    this.initialize().catch(error => {
      // Don't throw - this is background loading
    })
  }
  
  // Initialize only essential models for fast start
  async initializeMinimal(): Promise<void> {
    if (faceapi.nets.tinyFaceDetector.isLoaded) {
      return
    }
    
    try {
      
      // Only load TinyFaceDetector for basic detection
      await faceapi.nets.tinyFaceDetector.loadFromUri(this.MODEL_URL)
      
      // Load other models in background
      this.loadRemainingModelsInBackground()
    } catch (error) {
      throw error
    }
  }
  
  private loadRemainingModelsInBackground(): void {
    if (this.modelsLoaded) return
    
    const loadRemaining = async () => {
      try {
        if (!faceapi.nets.faceLandmark68Net.isLoaded) {
          await faceapi.nets.faceLandmark68Net.loadFromUri(this.MODEL_URL)
        }
        
        if (!faceapi.nets.faceRecognitionNet.isLoaded) {
          // Use simple loading without fetch interceptor for background loads
          await faceapi.nets.faceRecognitionNet.loadFromUri(this.MODEL_URL)
        }
        
        this.modelsLoaded = true
      } catch (error) {
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
      
      
      // Check current status
      const status = this.getModelStatus()
      
      // If all models are already loaded, just mark as complete
      if (status.tinyFaceDetector && status.faceLandmark68Net && status.faceRecognitionNet) {
        this.modelsLoaded = true
        return
      }
      
      // Always use parallel loading for all devices
      if (this.progressCallback) {
        this.progressCallback('正在加载人脸识别模型...', 0)
      }
      
      await this.loadModelsInParallel()
      
      // Verify all models are loaded
      const finalStatus = this.getModelStatus()
      const loadTime = performance.now() - startTime
      
      if (finalStatus.tinyFaceDetector && finalStatus.faceLandmark68Net && finalStatus.faceRecognitionNet) {
        this.modelsLoaded = true
        
        if (this.progressCallback) {
          this.progressCallback('模型加载完成', 100)
        }
      } else {
        throw new Error('Some models failed to load: ' + JSON.stringify(finalStatus))
      }
      
    } catch (error) {
      const loadTime = performance.now() - startTime
      
      // Log network details if available
      if ('connection' in navigator) {
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
    
    // Load TinyFaceDetector
    if (!faceapi.nets.tinyFaceDetector.isLoaded) {
      await this.loadModelWithRetrySimple(
        () => faceapi.nets.tinyFaceDetector.loadFromUri(this.MODEL_URL),
        'TinyFaceDetector',
        3
      )
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    
    // Load FaceLandmark68Net  
    if (!faceapi.nets.faceLandmark68Net.isLoaded) {
      await this.loadModelWithRetrySimple(
        () => faceapi.nets.faceLandmark68Net.loadFromUri(this.MODEL_URL),
        'FaceLandmark68Net',
        3
      )
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    
    // Load FaceRecognitionNet (largest)
    if (!faceapi.nets.faceRecognitionNet.isLoaded) {
      await this.loadModelWithRetrySimple(
        () => faceapi.nets.faceRecognitionNet.loadFromUri(this.MODEL_URL),
        'FaceRecognitionNet',
        3
      )
    }
  }
  
  private async loadModelsInParallel(): Promise<void> {
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
          
          try {
            const response = await savedOriginalFetch(input, init)
            return response
          } catch (fetchError) {
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
        modelsToLoad.push(
          this.loadModelWithRetrySimple(
            () => faceapi.nets.tinyFaceDetector.loadFromUri(this.MODEL_URL),
            'TinyFaceDetector'
          )
        )
      }
      
      if (!faceapi.nets.faceLandmark68Net.isLoaded) {
        modelsToLoad.push(
          this.loadModelWithRetrySimple(
            () => faceapi.nets.faceLandmark68Net.loadFromUri(this.MODEL_URL),
            'FaceLandmark68Net'
          )
        )
      }
      
      if (!faceapi.nets.faceRecognitionNet.isLoaded) {
        modelsToLoad.push(
          this.loadModelWithRetrySimple(
            () => faceapi.nets.faceRecognitionNet.loadFromUri(this.MODEL_URL),
            'FaceRecognitionNet'
          )
        )
      }
      
      if (modelsToLoad.length > 0) {
        await Promise.all(modelsToLoad)
        const parallelTime = performance.now() - loadStartTime
      } else {
      }
    } finally {
      // Always restore original fetch
      if (this.isFetchIntercepted && this.originalFetch) {
        window.fetch = this.originalFetch
        this.isFetchIntercepted = false
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
        await loadFn()
        
        const attemptTime = performance.now() - attemptStartTime
        const totalTime = performance.now() - modelStartTime
        
        if (this.progressCallback) {
          const progress = modelName === 'TinyFaceDetector' ? 33 :
                          modelName === 'FaceLandmark68Net' ? 66 : 100
          this.progressCallback(`已加载 ${modelName}`, progress)
        }
        
        return
      } catch (error: any) {
        lastError = error as Error
        const attemptTime = performance.now() - attemptStartTime
        
        if (attempt < maxRetries) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      }
    }
    
    // All retries failed
    const totalTime = performance.now() - modelStartTime
    throw lastError || new Error(`Failed to load ${modelName} after ${maxRetries} attempts`)
  }
  
  // DEPRECATED - This method is no longer used due to fetch interceptor issues
  // Kept for reference only - DO NOT USE
  // Use loadModelWithRetrySimple instead
  
  // Alternative loading approach (removed iOS-specific logic)
  private async loadModelsWithAlternativeApproach(): Promise<void> {
    
    // Try loading models one by one with custom fetch settings
    const models = [
      { name: 'TinyFaceDetector', loader: () => faceapi.nets.tinyFaceDetector },
      { name: 'FaceLandmark68Net', loader: () => faceapi.nets.faceLandmark68Net },
      { name: 'FaceRecognitionNet', loader: () => faceapi.nets.faceRecognitionNet }
    ]
    
    for (const model of models) {
      const net = model.loader()
      if (net.isLoaded) {
        continue
      }
      
      
      try {
        // Use a custom fetch with specific headers
        const originalFetch = window.fetch
        window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = typeof input === 'string' ? input : input.toString()
          
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
        
        
        // Small delay between models
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        // Continue trying to load other models
      }
    }
  }
  
  // Ensure fetch is restored (safety mechanism)
  private ensureFetchRestored(): void {
    if (this.isFetchIntercepted && this.originalFetch) {
      window.fetch = this.originalFetch
      this.isFetchIntercepted = false
    }
  }
  
  // Force reload models (useful for error recovery)
  async forceReload(): Promise<void> {
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