// Face recognition service using face-api.js with Supabase storage
// Stores face descriptors in Supabase database for centralized management
// Simple logic: if no face -> enroll, if has face -> verify

import * as faceapi from 'face-api.js'
import { supabase } from './supabase'

class FaceRecognitionService {
  private modelsLoaded = false

  // Initialize the service and load face-api.js models
  async initialize(): Promise<void> {
    if (this.modelsLoaded) return

    try {
      // Load models from local files
      const MODEL_URL = '/models'
      
      // Load required models for face detection and recognition
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ])

      this.modelsLoaded = true
      console.log('[FaceRecognition] Models loaded successfully')
    } catch (error) {
      console.error('[FaceRecognition] Failed to load models:', error)
      throw new Error('Failed to initialize face recognition service')
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
    if (!this.modelsLoaded) {
      await this.initialize()
    }

    try {
      const descriptors: Float32Array[] = []
      let attempts = 0
      const maxAttempts = sampleCount * 3 // Allow retries
      
      // Collect multiple face samples
      while (descriptors.length < sampleCount && attempts < maxAttempts) {
        attempts++
        
        // Detect face and extract descriptor
        const detection = await faceapi
          .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
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
    if (!this.modelsLoaded) {
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

      // Detect current face
      const detection = await faceapi
        .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
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