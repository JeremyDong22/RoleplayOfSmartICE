// Face recognition service using face-api.js with Supabase storage
// Stores face descriptors in Supabase database for centralized management
// Simple logic: if no face -> enroll, if has face -> verify

import * as faceapi from 'face-api.js'
import { supabase } from './supabase'
import { faceModelManager } from './faceModelManager'

class FaceRecognitionService {
  // Detect if running on iPad/iOS
  private isIOSDevice(): boolean {
    const ua = navigator.userAgent
    return /iPad|iPhone|iPod/.test(ua) || 
           (ua.includes('Macintosh') && 'ontouchend' in document)
  }

  // Initialize the service and load face-api.js models
  async initialize(): Promise<void> {
    // Use the global model manager
    await faceModelManager.initialize()
  }

  private async loadModelsLegacy(): Promise<void> {
    try {
      const MODEL_URL = '/models'
      const isIOS = this.isIOSDevice()
      
      console.log(`[FaceRecognition] Loading models... (iOS device: ${isIOS})`)
      
      // Check if models are already loaded by face-api.js
      const tinyFaceDetectorLoaded = faceapi.nets.tinyFaceDetector.isLoaded
      const faceLandmark68NetLoaded = faceapi.nets.faceLandmark68Net.isLoaded
      const faceRecognitionNetLoaded = faceapi.nets.faceRecognitionNet.isLoaded
      
      console.log('[FaceRecognition] Models status:', {
        tinyFaceDetector: tinyFaceDetectorLoaded,
        faceLandmark68Net: faceLandmark68NetLoaded,
        faceRecognitionNet: faceRecognitionNetLoaded
      })
      
      // For iOS devices, load models sequentially with longer delays
      if (isIOS) {
        console.log('[FaceRecognition] Using sequential loading for iOS device')
        
        // Load TinyFaceDetector first (smallest model)
        if (!tinyFaceDetectorLoaded) {
          await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
          console.log('[FaceRecognition] TinyFaceDetector loaded')
          // Longer delay for iOS
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        
        // Load FaceLandmark68Net
        if (!faceLandmark68NetLoaded) {
          await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
          console.log('[FaceRecognition] FaceLandmark68Net loaded')
          // Longer delay for iOS
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        
        // Load FaceRecognitionNet (largest model) - this is the problematic one
        if (!faceRecognitionNetLoaded) {
          // Add retry logic specifically for the large model
          let retries = 0
          const maxRetries = 3
          
          while (retries < maxRetries && !faceapi.nets.faceRecognitionNet.isLoaded) {
            try {
              console.log(`[FaceRecognition] Loading FaceRecognitionNet (attempt ${retries + 1}/${maxRetries})`)
              await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
              console.log('[FaceRecognition] FaceRecognitionNet loaded successfully')
              break
            } catch (loadError) {
              retries++
              console.error(`[FaceRecognition] Failed to load FaceRecognitionNet (attempt ${retries}):`, loadError)
              
              if (retries < maxRetries) {
                // Wait longer before retrying (exponential backoff)
                const waitTime = 1000 * retries
                console.log(`[FaceRecognition] Waiting ${waitTime}ms before retry...`)
                await new Promise(resolve => setTimeout(resolve, waitTime))
              } else {
                throw loadError
              }
            }
          }
        }
      } else {
        // For non-iOS devices, load in parallel as before
        const modelsToLoad = []
        
        if (!tinyFaceDetectorLoaded) {
          modelsToLoad.push(faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL))
        }
        if (!faceLandmark68NetLoaded) {
          modelsToLoad.push(faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL))
        }
        if (!faceRecognitionNetLoaded) {
          modelsToLoad.push(faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL))
        }
        
        if (modelsToLoad.length > 0) {
          await Promise.all(modelsToLoad)
        }
      }

      // Legacy code - kept for reference but not used
      console.log('[FaceRecognition] Legacy load complete')
    } catch (error) {
      console.error('[FaceRecognition] Legacy load failed:', error)
      throw error
    }
  }

  // Check if user has enrolled face descriptor
  async hasUserEnrolled(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('roleplay_users')
      .select('face_descriptor')
      .eq('id', userId)
      .single()

    if (error || !data) return false
    return !!data.face_descriptor
  }

  // Enroll user's face - save descriptor to Supabase
  async enrollUser(userId: string, videoElement: HTMLVideoElement, sampleCount: number = 1): Promise<void> {
    // Ensure models are loaded via the manager
    if (!faceModelManager.isReady()) {
      await this.initialize()
    }

    try {
      const descriptors: Float32Array[] = []
      let attempts = 0
      const maxAttempts = sampleCount * 3 // Allow retries
      
      // Collect multiple face samples
      while (descriptors.length < sampleCount && attempts < maxAttempts) {
        attempts++
        
        // Detect face and extract descriptor with iOS optimizations
        const isIOS = this.isIOSDevice()
        const detectorOptions = new faceapi.TinyFaceDetectorOptions({
          inputSize: isIOS ? 320 : 416, // Smaller input size for iOS
          scoreThreshold: 0.5
        })
        
        const detection = await faceapi
          .detectSingleFace(videoElement, detectorOptions)
          .withFaceLandmarks()
          .withFaceDescriptor()

        if (detection) {
          descriptors.push(detection.descriptor)
          console.log(`[FaceRecognition] Captured sample ${descriptors.length}/${sampleCount}`)
          
          // Wait a bit between captures for variety
          if (descriptors.length < sampleCount) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        } else {
          console.warn(`[FaceRecognition] No face detected in attempt ${attempts}`)
        }
      }
      
      if (descriptors.length === 0) {
        throw new Error('未检测到人脸，请确保面部清晰可见')
      }
      
      // Calculate average descriptor if multiple samples
      let finalDescriptor: Float32Array
      if (descriptors.length === 1) {
        finalDescriptor = descriptors[0]
      } else {
        // Average multiple descriptors for better accuracy
        finalDescriptor = new Float32Array(128)
        for (let i = 0; i < 128; i++) {
          let sum = 0
          for (const descriptor of descriptors) {
            sum += descriptor[i]
          }
          finalDescriptor[i] = sum / descriptors.length
        }
        console.log(`[FaceRecognition] Averaged ${descriptors.length} face samples`)
      }

      // Convert Float32Array to regular array for JSON storage
      const descriptor = Array.from(finalDescriptor)

      // Save to Supabase
      const { error } = await supabase
        .from('roleplay_users')
        .update({ face_descriptor: descriptor })
        .eq('id', userId)

      if (error) {
        throw new Error('保存人脸数据失败')
      }

      console.log(`[FaceRecognition] User enrolled successfully with ${descriptors.length} samples`)
    } catch (error) {
      console.error('[FaceRecognition] Enrollment failed:', error)
      throw error
    }
  }

  // Verify user's face against stored descriptor
  async verifyUser(userId: string, videoElement: HTMLVideoElement): Promise<boolean> {
    const result = await this.calculateMatchDistance(userId, videoElement)
    return result.isMatch
  }

  // Calculate match distance and return detailed info
  async calculateMatchDistance(userId: string, videoElement: HTMLVideoElement): Promise<{distance: number, isMatch: boolean, similarity: number}> {
    // Ensure models are loaded via the manager
    if (!faceModelManager.isReady()) {
      await this.initialize()
    }

    try {
      // Get stored face descriptor from Supabase
      const { data, error } = await supabase
        .from('roleplay_users')
        .select('face_descriptor')
        .eq('id', userId)
        .single()

      if (error || !data?.face_descriptor) {
        throw new Error('用户未注册人脸')
      }

      // Detect current face with iOS optimizations
      const isIOS = this.isIOSDevice()
      const detectorOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: isIOS ? 320 : 416, // Smaller input size for iOS to reduce memory usage
        scoreThreshold: 0.5
      })
      
      const detection = await faceapi
        .detectSingleFace(videoElement, detectorOptions)
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection) {
        throw new Error('未检测到人脸，请确保面部清晰可见')
      }

      // Compare descriptors - handle both single and multiple descriptors
      let minDistance = Infinity
      
      // Check if stored descriptor is an array of arrays (multiple angles)
      if (Array.isArray(data.face_descriptor[0])) {
        // Multiple descriptors stored (from multi-angle capture)
        console.log('[FaceRecognition] Comparing against multiple stored descriptors')
        for (const descriptor of data.face_descriptor) {
          const storedDescriptor = new Float32Array(descriptor)
          const distance = faceapi.euclideanDistance(storedDescriptor, detection.descriptor)
          minDistance = Math.min(minDistance, distance)
        }
      } else {
        // Single descriptor stored
        console.log('[FaceRecognition] Comparing against single stored descriptor')
        const storedDescriptor = new Float32Array(data.face_descriptor)
        minDistance = faceapi.euclideanDistance(storedDescriptor, detection.descriptor)
      }
      
      // Threshold for face matching (lower = stricter)
      // Changed from 0.6 to 0.35 for high security (96.5% similarity required)
      const MATCH_THRESHOLD = 0.35
      
      // Calculate similarity percentage (0-100%)
      const similarity = Math.max(0, (1 - minDistance / 2) * 100)
      
      console.log(`[FaceRecognition] Distance: ${minDistance.toFixed(3)}, Threshold: ${MATCH_THRESHOLD}, Similarity: ${similarity.toFixed(1)}%`)
      
      return {
        distance: minDistance,
        isMatch: minDistance < MATCH_THRESHOLD,
        similarity: similarity
      }
    } catch (error) {
      console.error('[FaceRecognition] Verification failed:', error)
      throw error
    }
  }

  // Clear user's face data (for reset/re-enrollment)
  async clearUserFaceData(userId: string): Promise<void> {
    const { error } = await supabase
      .from('roleplay_users')
      .update({ face_descriptor: null })
      .eq('id', userId)

    if (error) {
      throw new Error('清除人脸数据失败')
    }
  }
}

// Export singleton instance
export const faceRecognitionService = new FaceRecognitionService()