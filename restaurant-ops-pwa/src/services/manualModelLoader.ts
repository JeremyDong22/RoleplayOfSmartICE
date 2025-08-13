// Manual model loader for iOS Safari
// Completely bypasses face-api.js's loader to avoid iOS issues
// Created: 2025-08-13

import * as faceapi from 'face-api.js'

export class ManualModelLoader {
  private static modelCache = new Map<string, ArrayBuffer>()
  
  // Pre-fetch all model files into memory
  static async prefetchModels(basePath: string): Promise<void> {
    console.log('[ManualModelLoader] Starting model pre-fetch...')
    
    const modelFiles = [
      // TinyFaceDetector
      'tiny_face_detector_model-weights_manifest.json',
      'tiny_face_detector_model-shard1.bin',
      // FaceLandmark68Net
      'face_landmark_68_model-weights_manifest.json', 
      'face_landmark_68_model-shard1.bin',
      // FaceRecognitionNet
      'face_recognition_model-weights_manifest.json',
      'face_recognition_model-shard1.bin',
      'face_recognition_model-shard2.bin'
    ]
    
    const fetchPromises = modelFiles.map(async (file) => {
      const url = `${basePath}/${file}`
      try {
        console.log(`[ManualModelLoader] Fetching ${file}...`)
        
        // Use XMLHttpRequest for better iOS compatibility
        const buffer = await this.fetchWithXHR(url)
        this.modelCache.set(file, buffer)
        
        console.log(`[ManualModelLoader] ✅ Cached ${file} (${buffer.byteLength} bytes)`)
      } catch (error) {
        console.error(`[ManualModelLoader] Failed to fetch ${file}:`, error)
      }
    })
    
    await Promise.all(fetchPromises)
    console.log('[ManualModelLoader] Pre-fetch complete')
  }
  
  // Use XMLHttpRequest instead of fetch for iOS
  private static fetchWithXHR(url: string): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('GET', url, true)
      xhr.responseType = 'arraybuffer'
      
      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve(xhr.response)
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`))
        }
      }
      
      xhr.onerror = () => reject(new Error('Network error'))
      xhr.ontimeout = () => reject(new Error('Request timeout'))
      xhr.timeout = 30000 // 30 second timeout
      
      xhr.send()
    })
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