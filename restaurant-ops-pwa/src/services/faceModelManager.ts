// Global face model manager to ensure models are loaded only once
// Prevents multiple components from loading the same models simultaneously
// Critical for iPad/iOS where network connections are easily interrupted
// Created: 2025-08-13

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
  
  private constructor() {}
  
  static getInstance(): FaceModelManager {
    if (!FaceModelManager.instance) {
      FaceModelManager.instance = new FaceModelManager()
    }
    return FaceModelManager.instance
  }
  
  // Detect if running on iPad/iOS (including Safari on macOS with touch)
  private isIOSDevice(): boolean {
    const ua = navigator.userAgent
    // Check for iOS devices
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream
    // Check for iPad on iOS 13+ (reports as Mac)
    const isIPadOS = ua.includes('Macintosh') && 'ontouchend' in document
    // Check for Safari browser (which has specific loading issues)
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua)
    
    // Log detection for debugging
    if (isIOS || isIPadOS || isSafari) {
      console.log('[ModelManager] Detected iOS/Safari environment:', { isIOS, isIPadOS, isSafari, ua })
    }
    
    return isIOS || isIPadOS || isSafari
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
        // iOS: Try manual loader first (most reliable)
        try {
          console.log('[ModelManager] Using manual pre-fetch loader for iOS/Safari...')
          await ManualModelLoader.loadFromCache(this.MODEL_URL)
        } catch (manualError) {
          console.warn('[ModelManager] Manual loader failed, trying iOS-specific loader...', manualError)
          try {
            await IOSModelLoader.loadAllModels(this.MODEL_URL)
          } catch (iosError) {
            console.warn('[ModelManager] iOS-specific loader failed, trying standard sequential loading...', iosError)
            try {
              await this.loadModelsSequentially()
            } catch (error) {
              console.warn('[ModelManager] Sequential loading failed, trying alternative approach...')
              await this.loadModelsWithAlternativeApproach()
            }
          }
        }
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
        'TinyFaceDetector',
        5 // Increase retries for iOS
      )
      await new Promise(resolve => setTimeout(resolve, 1000)) // Longer delay
    }
    
    // Load FaceLandmark68Net  
    if (!faceapi.nets.faceLandmark68Net.isLoaded) {
      console.log('[ModelManager] Loading FaceLandmark68Net...')
      await this.loadModelWithRetry(
        () => faceapi.nets.faceLandmark68Net.loadFromUri(this.MODEL_URL),
        'FaceLandmark68Net',
        7 // More retries for problematic model
      )
      await new Promise(resolve => setTimeout(resolve, 1000)) // Longer delay
    }
    
    // Load FaceRecognitionNet (largest, most problematic)
    if (!faceapi.nets.faceRecognitionNet.isLoaded) {
      console.log('[ModelManager] Loading FaceRecognitionNet...')
      await this.loadModelWithRetry(
        () => faceapi.nets.faceRecognitionNet.loadFromUri(this.MODEL_URL),
        'FaceRecognitionNet',
        7 // More retries for the large model
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
        
        // Try different URL strategies for iOS
        if (isIOS && attempt > 2) {
          // After 2 failed attempts, try absolute URL
          const originalLoadFn = loadFn
          loadFn = async () => {
            const net = modelName === 'TinyFaceDetector' ? faceapi.nets.tinyFaceDetector :
                       modelName === 'FaceLandmark68Net' ? faceapi.nets.faceLandmark68Net :
                       faceapi.nets.faceRecognitionNet
            await net.loadFromUri(this.MODEL_URL_ABSOLUTE)
          }
        }
        
        await loadFn()
        console.log(`[ModelManager] ✅ ${modelName} loaded successfully`)
        return
      } catch (error: any) {
        lastError = error as Error
        console.error(`[ModelManager] Failed to load ${modelName} (attempt ${attempt}):`, error)
        
        // iOS Safari specific error handling
        if (isIOS && (error?.message?.includes('Load failed') || error?.message?.includes('TypeError'))) {
          console.warn(`[ModelManager] iOS Safari load failed for ${modelName}, will retry with longer delay`)
          
          // Clear any potential memory issues
          if (typeof (window as any).gc === 'function') {
            (window as any).gc()
          }
          
          // Longer wait for iOS Safari with exponential backoff
          if (attempt < actualMaxRetries) {
            const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000)
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
  
  // Alternative loading approach for iOS Safari
  private async loadModelsWithAlternativeApproach(): Promise<void> {
    console.log('[ModelManager] Using alternative loading approach for iOS Safari...')
    
    // Try loading models one by one with longer delays and smaller chunks
    const models = [
      { name: 'TinyFaceDetector', loader: () => faceapi.nets.tinyFaceDetector, size: 'small' },
      { name: 'FaceLandmark68Net', loader: () => faceapi.nets.faceLandmark68Net, size: 'medium' },
      { name: 'FaceRecognitionNet', loader: () => faceapi.nets.faceRecognitionNet, size: 'large' }
    ]
    
    for (const model of models) {
      const net = model.loader()
      if (net.isLoaded) {
        console.log(`[ModelManager] ${model.name} already loaded`)
        continue
      }
      
      console.log(`[ModelManager] Loading ${model.name} with alternative approach...`)
      
      // Clear any cached data to free memory
      if (typeof (window as any).gc === 'function') {
        (window as any).gc()
      }
      
      // Wait longer for large models on iOS
      const waitTime = model.size === 'large' ? 3000 : model.size === 'medium' ? 2000 : 1000
      await new Promise(resolve => setTimeout(resolve, waitTime))
      
      try {
        // Use a custom fetch with specific headers for iOS
        const originalFetch = window.fetch
        window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
          if (typeof input === 'string' && input.includes('/models/')) {
            // Add cache control headers for model files
            init = {
              ...init,
              mode: 'cors',
              cache: 'force-cache',
              credentials: 'omit',
              headers: {
                ...((init?.headers as any) || {}),
                'Accept': 'application/octet-stream, */*'
              }
            }
          }
          return originalFetch(input, init)
        }
        
        await net.loadFromUri(this.MODEL_URL)
        
        // Restore original fetch
        window.fetch = originalFetch
        
        console.log(`[ModelManager] ✅ ${model.name} loaded with alternative approach`)
        
        // Extra delay after successful load on iOS
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`[ModelManager] Failed to load ${model.name} with alternative approach:`, error)
        // Continue trying to load other models
      }
    }
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