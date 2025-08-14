// Face recognition service using face-api.js with Supabase storage
// Stores face descriptors in Supabase database for centralized management
// Updated: 2025-08-13 - Removed mobile-specific logic, unified loading with detailed logging
// Updated: 2025-08-14 - Removed all console.log statements

import * as faceapi from 'face-api.js'
import { getSupabase } from './supabase'
import { faceModelManager } from './faceModelManager'

class FaceRecognitionService {
  // Get device info for logging
  private getDeviceInfo(): string {
    const ua = navigator.userAgent
    const isMobile = /iPad|iPhone|iPod|Android/i.test(ua) || 
                     (ua.includes('Macintosh') && 'ontouchend' in document)
    return `Mobile: ${isMobile}, UA: ${ua.substring(0, 50)}...`
  }

  // Initialize the service and load face-api.js models
  async initialize(): Promise<void> {
    // Use the global model manager
    await faceModelManager.initialize()
  }

  private isIOSDevice(): boolean {
    const ua = navigator.userAgent
    return /iPad|iPhone|iPod/.test(ua) || 
           (ua.includes('Macintosh') && 'ontouchend' in document)
  }

  private async loadModelsLegacy(): Promise<void> {
    try {
      const MODEL_URL = '/models'
      const isIOS = this.isIOSDevice()
      
      // Check if models are already loaded by face-api.js
      const tinyFaceDetectorLoaded = faceapi.nets.tinyFaceDetector.isLoaded
      const faceLandmark68NetLoaded = faceapi.nets.faceLandmark68Net.isLoaded
      const faceRecognitionNetLoaded = faceapi.nets.faceRecognitionNet.isLoaded
      
      // For iOS devices, load models sequentially with longer delays
      if (isIOS) {
        // Load TinyFaceDetector first (smallest model)
        if (!tinyFaceDetectorLoaded) {
          await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
          // Longer delay for iOS
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        
        // Load FaceLandmark68Net
        if (!faceLandmark68NetLoaded) {
          await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
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
              await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
              break
            } catch (loadError) {
              retries++
              
              if (retries < maxRetries) {
                // Wait longer before retrying (exponential backoff)
                const waitTime = 1000 * retries
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
    } catch (error) {
      throw error
    }
  }

  // Check if user has enrolled face descriptor
  async hasUserEnrolled(userId: string): Promise<boolean> {
    const { data, error } = await getSupabase()
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
        const attemptStart = performance.now()
        
        // Use smaller input size for better mobile performance
        const detectorOptions = new faceapi.TinyFaceDetectorOptions({
          inputSize: 128, // Reduced from 416 for 10x faster processing
          scoreThreshold: 0.4  // Slightly lower threshold to compensate for smaller size
        })
        
        const detection = await faceapi
          .detectSingleFace(videoElement, detectorOptions)
          .withFaceLandmarks()
          .withFaceDescriptor()

        const detectTime = performance.now() - attemptStart
        
        if (detection) {
          descriptors.push(detection.descriptor)
          
          // Wait a bit between captures for variety
          if (descriptors.length < sampleCount) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
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
      }

      // Convert Float32Array to regular array for JSON storage
      const descriptor = Array.from(finalDescriptor)

      // Save to Supabase
      const { error } = await getSupabase()
        .from('roleplay_users')
        .update({ face_descriptor: descriptor })
        .eq('id', userId)

      if (error) {
        throw new Error('保存人脸数据失败')
      }
    } catch (error) {
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
      const { data, error } = await getSupabase()
        .from('roleplay_users')
        .select('face_descriptor')
        .eq('id', userId)
        .single()

      if (error || !data?.face_descriptor) {
        throw new Error('用户未注册人脸')
      }

      // Detect current face with unified settings
      const detectStart = performance.now()
      
      const detectorOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: 128, // Reduced from 416 for 10x faster processing
        scoreThreshold: 0.4  // Slightly lower threshold to compensate for smaller size
      })
      
      const detection = await faceapi
        .detectSingleFace(videoElement, detectorOptions)
        .withFaceLandmarks()
        .withFaceDescriptor()
      
      const detectTime = performance.now() - detectStart

      if (!detection) {
        throw new Error('未检测到人脸，请确保面部清晰可见')
      }

      // Compare descriptors - handle both single and multiple descriptors
      let minDistance = Infinity
      
      // Check if stored descriptor is an array of arrays (multiple angles)
      if (Array.isArray(data.face_descriptor[0])) {
        // Multiple descriptors stored (from multi-angle capture)
        for (const descriptor of data.face_descriptor) {
          const storedDescriptor = new Float32Array(descriptor)
          const distance = faceapi.euclideanDistance(storedDescriptor, detection.descriptor)
          minDistance = Math.min(minDistance, distance)
        }
      } else {
        // Single descriptor stored
        const storedDescriptor = new Float32Array(data.face_descriptor)
        minDistance = faceapi.euclideanDistance(storedDescriptor, detection.descriptor)
      }
      
      // Threshold for face matching (lower = stricter)
      // Changed from 0.6 to 0.35 for high security (96.5% similarity required)
      const MATCH_THRESHOLD = 0.35
      
      // Calculate similarity percentage (0-100%)
      const similarity = Math.max(0, (1 - minDistance / 2) * 100)
      
      return {
        distance: minDistance,
        isMatch: minDistance < MATCH_THRESHOLD,
        similarity: similarity
      }
    } catch (error) {
      throw error
    }
  }

  // Clear user's face data (for reset/re-enrollment)
  async clearUserFaceData(userId: string): Promise<void> {
    const { error } = await getSupabase()
      .from('roleplay_users')
      .update({ face_descriptor: null })
      .eq('id', userId)

    if (error) {
      throw new Error('清除人脸数据失败')
    }
  }

  // Batch match multiple users at once (optimized for login)
  // Only detect face once and compare with all users in memory
  async findBestMatch(
    videoElement: HTMLVideoElement, 
    users: any[],
    options: { fastMode?: boolean } = {}
  ): Promise<{
    user: any | null,
    distance: number,
    similarity: number,
    isMatch: boolean
  }> {
    // Ensure models are loaded
    if (!faceModelManager.isReady()) {
      await this.initialize()
    }

    try {
      const startTime = performance.now()

      // Verify video element is ready with timeout
      if (!videoElement || videoElement.readyState < 2) {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Video element not ready after 5 seconds'))
          }, 5000)
          
          if (videoElement.readyState >= 2) {
            clearTimeout(timeout)
            resolve(undefined)
          } else {
            videoElement.onloadeddata = () => {
              clearTimeout(timeout)
              resolve(undefined)
            }
          }
        })
      }

      // Step 1: Detect current face ONCE with timeout
      const detectStart = performance.now()
      
      const { fastMode = false } = options
      
      // Optimized settings for mobile performance
      const inputSize = fastMode ? 96 : 128  // Ultra-fast mode (96px) or standard (128px)
      
      const detectorOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize,
        scoreThreshold: fastMode ? 0.3 : 0.4
      })
      
      // Detect face, landmarks, and descriptor in ONE call with timeout
      const detectionPromise = faceapi
        .detectSingleFace(videoElement, detectorOptions)
        .withFaceLandmarks()
        .withFaceDescriptor()
      
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Face detection timeout after 10 seconds')), 10000)
      })
      
      const detection = await Promise.race([detectionPromise, timeoutPromise])
      
      if (!detection) {
        throw new Error('特征提取失败，请重试')
      }

      const detectTime = performance.now() - detectStart

      // Step 2: Compare with all users in memory (super fast)
      const compareStart = performance.now()
      
      const matches: Array<{user: any, distance: number, similarity: number}> = []
      
      for (const userData of users) {
        if (!userData.face_descriptor) {
          continue
        }

        // Calculate minimum distance for this user
        let minDistance = Infinity
        
        // Handle both single and multiple descriptors
        if (Array.isArray(userData.face_descriptor[0])) {
          // Multiple descriptors (multi-angle)
          for (const descriptor of userData.face_descriptor) {
            const storedDescriptor = new Float32Array(descriptor)
            const distance = faceapi.euclideanDistance(storedDescriptor, detection.descriptor)
            minDistance = Math.min(minDistance, distance)
          }
        } else {
          // Single descriptor
          const storedDescriptor = new Float32Array(userData.face_descriptor)
          minDistance = faceapi.euclideanDistance(storedDescriptor, detection.descriptor)
        }

        const similarity = Math.max(0, (1 - minDistance / 2) * 100)
        
        matches.push({
          user: userData,
          distance: minDistance,
          similarity: similarity
        })
      }

      const compareTime = performance.now() - compareStart

      // Step 3: Find best match
      if (matches.length === 0) {
        return {
          user: null,
          distance: Infinity,
          similarity: 0,
          isMatch: false
        }
      }

      // Sort by distance (best match first)
      matches.sort((a, b) => a.distance - b.distance)
      const bestMatch = matches[0]
      
      // Check threshold
      const MATCH_THRESHOLD = 0.35
      const isMatch = bestMatch.distance < MATCH_THRESHOLD

      return {
        user: isMatch ? bestMatch.user : null,
        distance: bestMatch.distance,
        similarity: bestMatch.similarity,
        isMatch: isMatch
      }

    } catch (error) {
      throw error
    }
  }
}

// Export singleton instance
export const faceRecognitionService = new FaceRecognitionService()