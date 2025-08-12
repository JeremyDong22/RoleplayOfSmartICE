// FaceIO Service - Simplified face recognition with cloud-based enrollment and verification
// FaceIO handles multiple sample capture, liveness detection, and face vector storage automatically

import faceIO from '@faceio/fiojs'
import { supabase } from './supabase'

// FaceIO Public ID - Replace with your actual ID from https://faceio.net
const FACEIO_PUBLIC_ID = 'fioaXXXX' // TODO: 请将 fioaXXXX 替换为你的实际 Public ID

class FaceIOService {
  private faceio: any = null
  private initialized = false

  // Initialize FaceIO with your public ID
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      console.log('[FaceIO] Initializing FaceIO service...')
      this.faceio = new faceIO(FACEIO_PUBLIC_ID)
      this.initialized = true
      console.log('[FaceIO] Service initialized successfully')
    } catch (error) {
      console.error('[FaceIO] Failed to initialize:', error)
      throw new Error('Failed to initialize FaceIO service')
    }
  }

  // Enroll a new user - FaceIO automatically captures multiple samples
  async enrollUser(userId: string, userName: string): Promise<string> {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      console.log('[FaceIO] Starting enrollment for user:', userName)
      
      // FaceIO enrollment - automatically handles:
      // 1. Multiple face captures from different angles
      // 2. Liveness detection (anti-spoofing)
      // 3. Face quality validation
      // 4. User guidance ("turn left", "move closer", etc.)
      const response = await this.faceio.enroll({
        locale: 'zh', // Chinese language for UI
        payload: {
          userId: userId,
          userName: userName,
          timestamp: new Date().toISOString()
        },
        permissionTimeout: 30000, // 30 seconds to grant camera permission
        idleTimeout: 60000, // 60 seconds idle timeout
        enrollIntroTimeout: 15000, // 15 seconds for intro
        replyTimeout: 120000, // 2 minutes total timeout
        userConsent: false, // No additional consent needed
        requirements: {
          lighting: 'optimal', // Require good lighting
          faceMatch: true, // Ensure face matches across samples
          antiSpoofing: true // Enable liveness detection
        }
      })

      console.log('[FaceIO] Enrollment successful:', response)
      
      // Save FaceIO ID to Supabase
      const { error } = await supabase
        .from('roleplay_users')
        .update({ faceio_id: response.facialId })
        .eq('id', userId)

      if (error) {
        console.error('[FaceIO] Failed to save FaceIO ID to database:', error)
        throw new Error('Failed to save enrollment data')
      }

      return response.facialId
    } catch (error: any) {
      console.error('[FaceIO] Enrollment failed:', error)
      
      // Handle specific FaceIO errors
      switch(error.code) {
        case 1: // PERMISSION_REFUSED
          throw new Error('摄像头权限被拒绝，请在浏览器设置中允许摄像头访问')
        case 2: // NO_FACES_DETECTED
          throw new Error('未检测到人脸，请确保面部清晰可见')
        case 3: // UNRECOGNIZED_FACE
          throw new Error('无法识别人脸，请调整光线并重试')
        case 4: // MANY_FACES
          throw new Error('检测到多张人脸，请确保只有一个人在摄像头前')
        case 5: // FACE_DUPLICATION
          throw new Error('该人脸已被注册')
        case 6: // MINORS_NOT_ALLOWED
          throw new Error('未成年人不允许注册')
        case 7: // PAD_ATTACK
          throw new Error('检测到欺骗行为，请使用真实人脸')
        case 8: // FACE_MISMATCH
          throw new Error('人脸不匹配，请保持稳定')
        case 9: // WRONG_PIN_CODE
          throw new Error('PIN码错误')
        case 10: // PROCESSING_ERR
          throw new Error('处理错误，请重试')
        case 11: // UNAUTHORIZED
          throw new Error('未授权的操作')
        case 12: // TERMS_NOT_ACCEPTED
          throw new Error('请接受服务条款')
        case 13: // UI_NOT_READY
          throw new Error('界面未准备好，请稍后重试')
        case 14: // SESSION_EXPIRED
          throw new Error('会话已过期，请刷新页面')
        case 15: // TIMEOUT
          throw new Error('操作超时，请重试')
        case 16: // TOO_MANY_REQUESTS
          throw new Error('请求过多，请稍后重试')
        case 17: // EMPTY_ORIGIN
          throw new Error('配置错误，请联系管理员')
        case 18: // FORBIDDDEN_ORIGIN
          throw new Error('域名未授权，请联系管理员')
        case 19: // FORBIDDDEN_COUNTRY
          throw new Error('您所在的地区不支持此服务')
        case 20: // SESSION_IN_PROGRESS
          throw new Error('另一个会话正在进行中')
        case 21: // NETWORK_IO
          throw new Error('网络错误，请检查网络连接')
        default:
          throw new Error(error.message || '人脸注册失败，请重试')
      }
    }
  }

  // Verify/authenticate a user
  async verifyUser(userId: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      console.log('[FaceIO] Starting verification for user ID:', userId)
      
      // Get stored FaceIO ID from Supabase
      const { data, error } = await supabase
        .from('roleplay_users')
        .select('faceio_id')
        .eq('id', userId)
        .single()

      if (error || !data?.faceio_id) {
        console.error('[FaceIO] User not enrolled:', userId)
        throw new Error('用户未注册人脸')
      }

      // FaceIO authentication - automatically handles:
      // 1. Face detection and quality check
      // 2. Liveness detection
      // 3. Matching against enrolled face
      // 4. User guidance
      const response = await this.faceio.authenticate({
        locale: 'zh', // Chinese language for UI
        permissionTimeout: 30000,
        idleTimeout: 60000,
        replyTimeout: 120000,
        requirements: {
          lighting: 'optimal',
          antiSpoofing: true
        }
      })

      console.log('[FaceIO] Authentication response:', response)
      
      // Verify the returned facial ID matches the stored one
      const isMatch = response.facialId === data.faceio_id
      
      if (isMatch) {
        console.log('[FaceIO] Verification successful for user:', userId)
      } else {
        console.error('[FaceIO] Facial ID mismatch:', {
          expected: data.faceio_id,
          received: response.facialId
        })
      }

      return isMatch
    } catch (error: any) {
      console.error('[FaceIO] Verification failed:', error)
      
      // Handle specific FaceIO errors (same as enrollment)
      switch(error.code) {
        case 1: // PERMISSION_REFUSED
          throw new Error('摄像头权限被拒绝')
        case 2: // NO_FACES_DETECTED
          throw new Error('未检测到人脸')
        case 3: // UNRECOGNIZED_FACE
          throw new Error('人脸验证失败，请确保是本人操作')
        case 4: // MANY_FACES
          throw new Error('检测到多张人脸')
        case 7: // PAD_ATTACK
          throw new Error('检测到欺骗行为')
        case 15: // TIMEOUT
          throw new Error('验证超时，请重试')
        case 21: // NETWORK_IO
          throw new Error('网络错误')
        default:
          throw new Error(error.message || '人脸验证失败')
      }
    }
  }

  // Check if user has enrolled face
  async hasUserEnrolled(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('roleplay_users')
      .select('faceio_id')
      .eq('id', userId)
      .single()

    if (error || !data) return false
    return !!data.faceio_id
  }

  // Clear user's face data (for re-enrollment)
  async clearUserFaceData(userId: string): Promise<void> {
    const { error } = await supabase
      .from('roleplay_users')
      .update({ faceio_id: null })
      .eq('id', userId)

    if (error) {
      throw new Error('清除人脸数据失败')
    }
    
    console.log('[FaceIO] User face data cleared for re-enrollment')
  }
}

// Export singleton instance
export const faceIOService = new FaceIOService()