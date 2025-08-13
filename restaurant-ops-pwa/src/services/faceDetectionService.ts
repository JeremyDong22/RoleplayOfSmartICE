// Enhanced face detection service with simplified capture
// Fixed: Removed complex angle detection that doesn't work well with TinyFaceDetector
// Now uses simple quality-based multi-shot capture for better reliability

import * as faceapi from 'face-api.js'
import { faceModelManager } from './faceModelManager'

export interface FaceDetectionResult {
  detected: boolean
  quality: number // 0-1 quality score
  message: string
  box?: {
    x: number
    y: number
    width: number
    height: number
  }
}

class FaceDetectionService {
  // Detect if running on iPad/iOS
  private isIOSDevice(): boolean {
    const ua = navigator.userAgent
    return /iPad|iPhone|iPod/.test(ua) || 
           (ua.includes('Macintosh') && 'ontouchend' in document)
  }

  async initialize(): Promise<void> {
    // Use the global model manager
    await faceModelManager.initialize()
  }

  private async loadModelsLegacy(): Promise<void> {
    try {
      const MODEL_URL = '/models'
      const isIOS = this.isIOSDevice()
      
      console.log(`[FaceDetection] Loading models... (iOS device: ${isIOS})`)
      
      // Check if models are already loaded
      const tinyFaceDetectorLoaded = faceapi.nets.tinyFaceDetector.isLoaded
      const faceLandmark68NetLoaded = faceapi.nets.faceLandmark68Net.isLoaded
      const faceRecognitionNetLoaded = faceapi.nets.faceRecognitionNet.isLoaded
      
      console.log('[FaceDetection] Models status:', {
        tinyFaceDetector: tinyFaceDetectorLoaded,
        faceLandmark68Net: faceLandmark68NetLoaded,
        faceRecognitionNet: faceRecognitionNetLoaded
      })
      
      // For iOS devices, load models sequentially with longer delays
      if (isIOS) {
        console.log('[FaceDetection] Using sequential loading for iOS device')
        
        // Load TinyFaceDetector first (smallest model)
        if (!tinyFaceDetectorLoaded) {
          await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
          console.log('[FaceDetection] TinyFaceDetector loaded')
          // Longer delay for iOS
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        
        // Load FaceLandmark68Net
        if (!faceLandmark68NetLoaded) {
          await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
          console.log('[FaceDetection] FaceLandmark68Net loaded')
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
              console.log(`[FaceDetection] Loading FaceRecognitionNet (attempt ${retries + 1}/${maxRetries})`)
              await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
              console.log('[FaceDetection] FaceRecognitionNet loaded successfully')
              break
            } catch (loadError) {
              retries++
              console.error(`[FaceDetection] Failed to load FaceRecognitionNet (attempt ${retries}):`, loadError)
              
              if (retries < maxRetries) {
                // Wait longer before retrying (exponential backoff)
                const waitTime = 1000 * retries
                console.log(`[FaceDetection] Waiting ${waitTime}ms before retry...`)
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
      console.log('[FaceDetection] Legacy load complete')
    } catch (error) {
      console.error('[FaceDetection] Legacy load failed:', error)
      throw error
    }
  }

  // Simple face detection with quality assessment
  async detectFace(videoElement: HTMLVideoElement): Promise<FaceDetectionResult> {
    // Ensure models are loaded via the manager
    if (!faceModelManager.isReady()) {
      await this.initialize()
    }

    try {
      const isIOS = this.isIOSDevice()
      const detectorOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: isIOS ? 320 : 416, // Smaller input size for iOS
        scoreThreshold: 0.5
      })
      
      const detection = await faceapi
        .detectSingleFace(videoElement, detectorOptions)
        .withFaceLandmarks()

      if (!detection) {
        return {
          detected: false,
          quality: 0,
          message: '未检测到人脸，请确保面部在画面中央'
        }
      }

      // Calculate quality based on detection score and face size
      const videoWidth = videoElement.videoWidth
      const videoHeight = videoElement.videoHeight
      const faceBox = detection.detection.box
      const faceSize = faceBox.width * faceBox.height
      const imageSize = videoWidth * videoHeight
      const sizeRatio = faceSize / imageSize

      // Quality factors:
      // 1. Detection confidence
      // 2. Face size (should be 10-40% of image)
      // 3. Face position (should be centered)
      const confidence = detection.detection.score
      const sizeScore = Math.min(sizeRatio * 5, 1) // Optimal at 20% of image
      
      // Check if face is centered
      const centerX = faceBox.x + faceBox.width / 2
      const centerY = faceBox.y + faceBox.height / 2
      const xOffset = Math.abs(centerX - videoWidth / 2) / (videoWidth / 2)
      const yOffset = Math.abs(centerY - videoHeight / 2) / (videoHeight / 2)
      const centerScore = 1 - (xOffset + yOffset) / 2

      const quality = (confidence * 0.4 + sizeScore * 0.3 + centerScore * 0.3)

      let message = ''
      if (sizeRatio < 0.1) {
        message = '请靠近一些'
      } else if (sizeRatio > 0.4) {
        message = '请稍微远离一些'
      } else if (xOffset > 0.3) {
        message = centerX < videoWidth / 2 ? '请向右移动' : '请向左移动'
      } else if (yOffset > 0.3) {
        message = centerY < videoHeight / 2 ? '请向下移动' : '请向上移动'
      } else if (quality > 0.7) {
        message = '✓ 位置完美，保持不动'
      } else {
        message = '请保持面部正对摄像头'
      }

      return {
        detected: true,
        quality,
        message,
        box: {
          x: faceBox.x,
          y: faceBox.y,
          width: faceBox.width,
          height: faceBox.height
        }
      }
    } catch (error) {
      console.error('[FaceDetection] Detection failed:', error)
      return {
        detected: false,
        quality: 0,
        message: '检测失败，请重试'
      }
    }
  }

  // Get face descriptor for recognition
  async getFaceDescriptor(videoElement: HTMLVideoElement): Promise<Float32Array | null> {
    // Ensure models are loaded via the manager
    if (!faceModelManager.isReady()) {
      await this.initialize()
    }

    try {
      const isIOS = this.isIOSDevice()
      const detectorOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: isIOS ? 320 : 416, // Smaller input size for iOS
        scoreThreshold: 0.5
      })
      
      const detection = await faceapi
        .detectSingleFace(videoElement, detectorOptions)
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection) {
        return null
      }

      return detection.descriptor
    } catch (error) {
      console.error('[FaceDetection] Failed to get descriptor:', error)
      return null
    }
  }

  // Test face matching with multiple stored descriptors
  async testFaceMatch(
    videoElement: HTMLVideoElement,
    storedDescriptors: number[] | number[][]
  ): Promise<{ match: boolean; confidence: number; message: string }> {
    if (!this.modelsLoaded) {
      await this.initialize()
    }

    try {
      const isIOS = this.isIOSDevice()
      const detectorOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: isIOS ? 320 : 416, // Smaller input size for iOS
        scoreThreshold: 0.5
      })
      
      const detection = await faceapi
        .detectSingleFace(videoElement, detectorOptions)
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection) {
        return {
          match: false,
          confidence: 0,
          message: '未检测到人脸'
        }
      }

      // Handle both single descriptor (old format) and multiple descriptors (new format)
      let descriptorsToCompare: Float32Array[] = []
      
      if (typeof storedDescriptors[0] === 'number') {
        // Old format: single descriptor as flat array
        descriptorsToCompare = [new Float32Array(storedDescriptors as number[])]
      } else {
        // New format: multiple descriptors (9 angles)
        descriptorsToCompare = (storedDescriptors as number[][]).map(desc => new Float32Array(desc))
      }

      // Compare against all stored descriptors and find the best match
      let bestDistance = Infinity
      let bestConfidence = 0
      
      for (const storedDescriptor of descriptorsToCompare) {
        const distance = faceapi.euclideanDistance(storedDescriptor, detection.descriptor)
        if (distance < bestDistance) {
          bestDistance = distance
          bestConfidence = Math.max(0, 1 - distance)
        }
      }

      // Lower threshold to 0.5 (50%) for better recognition with multiple angles
      const match = bestDistance < 0.5

      let message = ''
      if (match) {
        message = `✓ 人脸匹配成功 (置信度: ${(bestConfidence * 100).toFixed(1)}%)`
      } else {
        message = `✗ 人脸不匹配 (置信度: ${(bestConfidence * 100).toFixed(1)}%)`
      }

      console.log(`[FaceDetection] Best match distance: ${bestDistance.toFixed(3)}, Confidence: ${(bestConfidence * 100).toFixed(1)}%`)

      return { match, confidence: bestConfidence, message }
    } catch (error) {
      console.error('[FaceDetection] Test match failed:', error)
      return {
        match: false,
        confidence: 0,
        message: '测试失败'
      }
    }
  }
}

export const faceDetectionService = new FaceDetectionService()