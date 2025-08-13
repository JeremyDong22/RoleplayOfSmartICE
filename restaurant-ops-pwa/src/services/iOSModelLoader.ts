// iOS-specific model loader that manually fetches and loads models
// Works around iOS Safari's issues with face-api.js default loader

import * as faceapi from 'face-api.js'

export class IOSModelLoader {
  private static async fetchWithRetry(url: string, retries = 3): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          mode: 'cors',
          cache: 'force-cache',
          credentials: 'same-origin'
        })
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        return response
      } catch (error) {
        console.warn(`[IOSModelLoader] Fetch attempt ${i + 1} failed for ${url}:`, error)
        if (i === retries - 1) throw error
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)))
      }
    }
    
    throw new Error('Failed to fetch after all retries')
  }
  
  static async loadTinyFaceDetector(modelPath: string): Promise<void> {
    if (faceapi.nets.tinyFaceDetector.isLoaded) {
      console.log('[IOSModelLoader] TinyFaceDetector already loaded')
      return
    }
    
    try {
      console.log('[IOSModelLoader] Loading TinyFaceDetector manually...')
      
      // Fetch manifest first
      const manifestUrl = `${modelPath}/tiny_face_detector_model-weights_manifest.json`
      const manifestResponse = await this.fetchWithRetry(manifestUrl)
      const manifest = await manifestResponse.json()
      
      // Fetch model weights
      const weightsUrl = `${modelPath}/tiny_face_detector_model-shard1.bin`
      const weightsResponse = await this.fetchWithRetry(weightsUrl)
      const weightsBuffer = await weightsResponse.arrayBuffer()
      
      // Load into face-api.js
      const weightMap = await faceapi.tf.io.loadWeights(
        manifest,
        async (path: string) => {
          if (path.includes('shard1')) {
            return weightsBuffer
          }
          // If there are multiple shards, fetch them here
          const shardResponse = await this.fetchWithRetry(`${modelPath}/${path}`)
          return shardResponse.arrayBuffer()
        }
      )
      
      await faceapi.nets.tinyFaceDetector.load(weightMap)
      console.log('[IOSModelLoader] ✅ TinyFaceDetector loaded successfully')
    } catch (error) {
      console.error('[IOSModelLoader] Failed to load TinyFaceDetector:', error)
      throw error
    }
  }
  
  static async loadFaceLandmark68Net(modelPath: string): Promise<void> {
    if (faceapi.nets.faceLandmark68Net.isLoaded) {
      console.log('[IOSModelLoader] FaceLandmark68Net already loaded')
      return
    }
    
    try {
      console.log('[IOSModelLoader] Loading FaceLandmark68Net manually...')
      
      // For face landmark, try the standard loader first with custom fetch
      const originalFetch = window.fetch
      let fetchCalls = 0
      
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        fetchCalls++
        console.log(`[IOSModelLoader] Intercepted fetch #${fetchCalls}:`, input)
        
        // Add retry logic to each fetch
        return this.fetchWithRetry(input.toString())
      }
      
      try {
        await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath)
        console.log('[IOSModelLoader] ✅ FaceLandmark68Net loaded successfully')
      } finally {
        window.fetch = originalFetch
      }
    } catch (error) {
      console.error('[IOSModelLoader] Failed to load FaceLandmark68Net:', error)
      throw error
    }
  }
  
  static async loadFaceRecognitionNet(modelPath: string): Promise<void> {
    if (faceapi.nets.faceRecognitionNet.isLoaded) {
      console.log('[IOSModelLoader] FaceRecognitionNet already loaded')
      return
    }
    
    try {
      console.log('[IOSModelLoader] Loading FaceRecognitionNet manually...')
      
      // For face recognition, try the standard loader first with custom fetch
      const originalFetch = window.fetch
      let fetchCalls = 0
      
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        fetchCalls++
        console.log(`[IOSModelLoader] Intercepted fetch #${fetchCalls}:`, input)
        
        // Add retry logic and custom headers
        return this.fetchWithRetry(input.toString())
      }
      
      try {
        await faceapi.nets.faceRecognitionNet.loadFromUri(modelPath)
        console.log('[IOSModelLoader] ✅ FaceRecognitionNet loaded successfully')
      } finally {
        window.fetch = originalFetch
      }
    } catch (error) {
      console.error('[IOSModelLoader] Failed to load FaceRecognitionNet:', error)
      throw error
    }
  }
  
  static async loadAllModels(modelPath: string): Promise<void> {
    console.log('[IOSModelLoader] Starting iOS-specific model loading...')
    
    // Load models sequentially with delays
    await this.loadTinyFaceDetector(modelPath)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    await this.loadFaceLandmark68Net(modelPath)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    await this.loadFaceRecognitionNet(modelPath)
    
    console.log('[IOSModelLoader] ✅ All models loaded successfully')
  }
}