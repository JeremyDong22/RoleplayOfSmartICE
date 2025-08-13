/**
 * Face Detection Cleanup Service
 * Provides centralized cleanup for face detection resources to prevent memory leaks and hanging
 * Created: 2025-01-13
 */

import * as faceapi from 'face-api.js'

class FaceDetectionCleanupService {
  private static instance: FaceDetectionCleanupService
  private activeStreams: Set<MediaStream> = new Set()
  private activeVideos: Set<HTMLVideoElement> = new Set()

  private constructor() {}

  static getInstance(): FaceDetectionCleanupService {
    if (!FaceDetectionCleanupService.instance) {
      FaceDetectionCleanupService.instance = new FaceDetectionCleanupService()
    }
    return FaceDetectionCleanupService.instance
  }

  /**
   * Register a media stream for tracking
   */
  registerStream(stream: MediaStream) {
    this.activeStreams.add(stream)
    console.log('[CleanupService] Stream registered. Active streams:', this.activeStreams.size)
  }

  /**
   * Register a video element for tracking
   */
  registerVideo(video: HTMLVideoElement) {
    this.activeVideos.add(video)
    console.log('[CleanupService] Video registered. Active videos:', this.activeVideos.size)
  }

  /**
   * Clean up a specific media stream
   */
  cleanupStream(stream: MediaStream | null) {
    if (!stream) return
    
    console.log('[CleanupService] Cleaning up stream...')
    stream.getTracks().forEach(track => {
      track.stop()
      track.enabled = false
      console.log(`[CleanupService] Track ${track.kind} stopped`)
    })
    
    this.activeStreams.delete(stream)
  }

  /**
   * Clean up a specific video element
   */
  cleanupVideo(video: HTMLVideoElement | null) {
    if (!video) return
    
    console.log('[CleanupService] Cleaning up video element...')
    video.pause()
    video.srcObject = null
    video.load() // Force reload to clear internal buffers
    
    // Clear all event listeners
    video.onloadedmetadata = null
    video.onloadeddata = null
    video.onerror = null
    video.onplay = null
    video.onpause = null
    
    this.activeVideos.delete(video)
  }

  /**
   * Clean up face-api.js tensors and memory
   */
  async cleanupFaceApiMemory() {
    console.log('[CleanupService] Cleaning face-api.js memory...')
    
    if (typeof faceapi === 'undefined') {
      console.log('[CleanupService] face-api.js not loaded, skipping tensor cleanup')
      return
    }

    try {
      // Get tensor count before cleanup
      const engine = (faceapi.env as any).engine
      if (engine) {
        const numTensorsBefore = engine.state?.numTensors || 0
        console.log(`[CleanupService] Tensors before cleanup: ${numTensorsBefore}`)
        
        // Dispose all tensors
        if (engine.dispose) {
          await engine.dispose()
        }
        
        // Force garbage collection if available
        if (typeof (globalThis as any).gc !== 'undefined') {
          (globalThis as any).gc()
        }
        
        const numTensorsAfter = engine.state?.numTensors || 0
        console.log(`[CleanupService] Tensors after cleanup: ${numTensorsAfter}`)
      }
    } catch (error) {
      console.warn('[CleanupService] Error during tensor cleanup:', error)
    }
  }

  /**
   * Perform complete cleanup of all face detection resources
   */
  async performCompleteCleanup() {
    console.log('[CleanupService] === STARTING COMPLETE CLEANUP ===')
    
    // 1. Clean up all active streams
    console.log(`[CleanupService] Cleaning ${this.activeStreams.size} active streams...`)
    this.activeStreams.forEach(stream => {
      this.cleanupStream(stream)
    })
    this.activeStreams.clear()
    
    // 2. Clean up all active video elements
    console.log(`[CleanupService] Cleaning ${this.activeVideos.size} active videos...`)
    this.activeVideos.forEach(video => {
      this.cleanupVideo(video)
    })
    this.activeVideos.clear()
    
    // 3. Clean up face-api.js memory
    await this.cleanupFaceApiMemory()
    
    // 4. Wait a bit for browser to release resources
    await new Promise(resolve => setTimeout(resolve, 100))
    
    console.log('[CleanupService] === COMPLETE CLEANUP FINISHED ===')
  }

  /**
   * Get cleanup statistics
   */
  getStats() {
    return {
      activeStreams: this.activeStreams.size,
      activeVideos: this.activeVideos.size,
      tensors: (faceapi?.env as any)?.engine?.state?.numTensors || 0
    }
  }
}

export const faceDetectionCleanup = FaceDetectionCleanupService.getInstance()