// Global face model manager to ensure models are loaded only once
// Prevents multiple components from loading the same models simultaneously
// Critical for iPad/iOS where network connections are easily interrupted
// Created: 2025-08-13

import * as faceapi from 'face-api.js'

class FaceModelManager {
  private static instance: FaceModelManager
  private modelsLoaded = false
  private loadingPromise: Promise<void> | null = null
  private loadAttempts = 0
  private readonly MODEL_URL = '/models'
  
  private constructor() {}
  
  static getInstance(): FaceModelManager {
    if (!FaceModelManager.instance) {
      FaceModelManager.instance = new FaceModelManager()
    }
    return FaceModelManager.instance
  }
  
  // Detect if running on iPad/iOS
  private isIOSDevice(): boolean {
    const ua = navigator.userAgent
    return /iPad|iPhone|iPod/.test(ua) || 
           (ua.includes('Macintosh') && 'ontouchend' in document)
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
    
    console.log('[ModelManager] Starting background preload...')
    
    // For iOS, add delay before starting background load to avoid conflicts
    const startPreload = async () => {
      if (this.isIOSDevice()) {
        console.log('[ModelManager] iOS detected, waiting 2s before background preload...')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
      
      // Start loading but don't await
      this.initialize().catch(error => {
        console.error('[ModelManager] Background preload failed:', error)
        // Don't throw - this is background loading
        // On iOS, might retry once more after a longer delay
        if (this.isIOSDevice() && !this.modelsLoaded) {
          console.log('[ModelManager] iOS background preload failed, retrying in 5s...')
          setTimeout(() => {
            if (!this.modelsLoaded && !this.loadingPromise) {
              this.initialize().catch(err => {
                console.error('[ModelManager] iOS retry also failed:', err)
              })
            }
          }, 5000)
        }
      })
    }
    
    startPreload()
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
        const isIOS = this.isIOSDevice()
        
        if (!faceapi.nets.faceLandmark68Net.isLoaded) {
          console.log('[ModelManager] Background loading FaceLandmark68Net...')
          await faceapi.nets.faceLandmark68Net.loadFromUri(this.MODEL_URL)
          if (isIOS) await new Promise(resolve => setTimeout(resolve, 200))
        }
        
        if (!faceapi.nets.faceRecognitionNet.isLoaded) {
          console.log('[ModelManager] Background loading FaceRecognitionNet...')
          await this.loadModelWithRetry(
            () => faceapi.nets.faceRecognitionNet.loadFromUri(this.MODEL_URL),
            'FaceRecognitionNet',
            3
          )
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
    try {
      this.loadAttempts++
      const isIOS = this.isIOSDevice()
      
      console.log(`[ModelManager] Starting model load (attempt ${this.loadAttempts}, iOS: ${isIOS})`)
      
      // Check current status
      const status = this.getModelStatus()
      console.log('[ModelManager] Current model status:', status)
      
      // If all models are already loaded, just mark as complete
      if (status.tinyFaceDetector && status.faceLandmark68Net && status.faceRecognitionNet) {
        console.log('[ModelManager] All models already loaded by face-api.js')
        this.modelsLoaded = true
        return
      }
      
      if (isIOS) {
        // iOS: Sequential loading with delays
        await this.loadModelsSequentially()
      } else {
        // Non-iOS: Parallel loading
        await this.loadModelsInParallel()
      }
      
      // Verify all models are loaded
      const finalStatus = this.getModelStatus()
      if (finalStatus.tinyFaceDetector && finalStatus.faceLandmark68Net && finalStatus.faceRecognitionNet) {
        this.modelsLoaded = true
        console.log('[ModelManager] ✅ All models loaded successfully')
      } else {
        throw new Error('Some models failed to load: ' + JSON.stringify(finalStatus))
      }
      
    } catch (error) {
      console.error('[ModelManager] Failed to load models:', error)
      
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
    console.log('[ModelManager] Using sequential loading for iOS')
    
    // Load TinyFaceDetector
    if (!faceapi.nets.tinyFaceDetector.isLoaded) {
      console.log('[ModelManager] Loading TinyFaceDetector...')
      await this.loadModelWithRetry(
        () => faceapi.nets.tinyFaceDetector.loadFromUri(this.MODEL_URL),
        'TinyFaceDetector'
      )
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // Load FaceLandmark68Net
    if (!faceapi.nets.faceLandmark68Net.isLoaded) {
      console.log('[ModelManager] Loading FaceLandmark68Net...')
      await this.loadModelWithRetry(
        () => faceapi.nets.faceLandmark68Net.loadFromUri(this.MODEL_URL),
        'FaceLandmark68Net'
      )
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // Load FaceRecognitionNet (largest, most problematic)
    if (!faceapi.nets.faceRecognitionNet.isLoaded) {
      console.log('[ModelManager] Loading FaceRecognitionNet...')
      await this.loadModelWithRetry(
        () => faceapi.nets.faceRecognitionNet.loadFromUri(this.MODEL_URL),
        'FaceRecognitionNet',
        5 // More retries for the large model
      )
    }
  }
  
  private async loadModelsInParallel(): Promise<void> {
    console.log('[ModelManager] Using parallel loading')
    
    const modelsToLoad = []
    
    if (!faceapi.nets.tinyFaceDetector.isLoaded) {
      modelsToLoad.push(
        this.loadModelWithRetry(
          () => faceapi.nets.tinyFaceDetector.loadFromUri(this.MODEL_URL),
          'TinyFaceDetector'
        )
      )
    }
    
    if (!faceapi.nets.faceLandmark68Net.isLoaded) {
      modelsToLoad.push(
        this.loadModelWithRetry(
          () => faceapi.nets.faceLandmark68Net.loadFromUri(this.MODEL_URL),
          'FaceLandmark68Net'
        )
      )
    }
    
    if (!faceapi.nets.faceRecognitionNet.isLoaded) {
      modelsToLoad.push(
        this.loadModelWithRetry(
          () => faceapi.nets.faceRecognitionNet.loadFromUri(this.MODEL_URL),
          'FaceRecognitionNet'
        )
      )
    }
    
    if (modelsToLoad.length > 0) {
      await Promise.all(modelsToLoad)
    }
  }
  
  private async loadModelWithRetry(
    loadFn: () => Promise<void>,
    modelName: string,
    maxRetries: number = 3
  ): Promise<void> {
    let lastError: Error | null = null
    const isIOS = this.isIOSDevice()
    
    // iOS Safari often fails on first load, increase retries
    const actualMaxRetries = isIOS ? Math.max(maxRetries, 5) : maxRetries
    
    for (let attempt = 1; attempt <= actualMaxRetries; attempt++) {
      try {
        console.log(`[ModelManager] Loading ${modelName} (attempt ${attempt}/${actualMaxRetries})`)
        
        // For iOS, add a small delay before loading to avoid race conditions
        if (isIOS && attempt > 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        
        await loadFn()
        console.log(`[ModelManager] ✅ ${modelName} loaded successfully`)
        return
      } catch (error: any) {
        lastError = error as Error
        console.error(`[ModelManager] Failed to load ${modelName} (attempt ${attempt}):`, error)
        
        // iOS Safari specific error handling
        if (isIOS && error?.message?.includes('Load failed')) {
          console.warn(`[ModelManager] iOS Safari load failed for ${modelName}, will retry with longer delay`)
          // Longer wait for iOS Safari
          if (attempt < actualMaxRetries) {
            const waitTime = Math.min(2000 * attempt, 10000)
            console.log(`[ModelManager] Waiting ${waitTime}ms before retry...`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
          }
        } else if (attempt < actualMaxRetries) {
          // Normal exponential backoff for other errors
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
          console.log(`[ModelManager] Waiting ${waitTime}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      }
    }
    
    // All retries failed
    throw lastError || new Error(`Failed to load ${modelName} after ${actualMaxRetries} attempts`)
  }
  
  // Force reload models (useful for error recovery)
  async forceReload(): Promise<void> {
    console.log('[ModelManager] Force reloading models...')
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