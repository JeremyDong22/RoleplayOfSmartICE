// Enhanced face detection service with simplified capture
// Fixed: Removed complex angle detection that doesn't work well with TinyFaceDetector
// Now uses simple quality-based multi-shot capture for better reliability

import * as faceapi from 'face-api.js'

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
  private modelsLoaded = false

  async initialize(): Promise<void> {
    if (this.modelsLoaded) return

    try {
      const MODEL_URL = '/models'
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ])

      this.modelsLoaded = true
      console.log('[FaceDetection] Models loaded successfully')
    } catch (error) {
      console.error('[FaceDetection] Failed to load models:', error)
      throw new Error('Failed to initialize face detection service')
    }
  }

  // Simple face detection with quality assessment
  async detectFace(videoElement: HTMLVideoElement): Promise<FaceDetectionResult> {
    if (!this.modelsLoaded) {
      await this.initialize()
    }

    try {
      const detection = await faceapi
        .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,
          scoreThreshold: 0.5
        }))
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
    if (!this.modelsLoaded) {
      await this.initialize()
    }

    try {
      const detection = await faceapi
        .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,
          scoreThreshold: 0.5
        }))
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
      const detection = await faceapi
        .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,
          scoreThreshold: 0.5
        }))
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