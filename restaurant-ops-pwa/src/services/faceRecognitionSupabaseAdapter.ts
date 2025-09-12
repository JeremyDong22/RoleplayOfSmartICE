/**
 * Face Recognition Supabase Adapter
 * Adapts existing face recognition to work with Supabase Auth
 * 
 * Created: 2025-01-12 - Bridge between face-api.js and Supabase Auth
 */
import { faceRecognitionService } from './faceRecognitionService'
import { authHybridService } from './authHybridService'
import { getSupabase } from './supabase'

export interface FaceAuthResult {
  success: boolean
  user?: any
  error?: string
  similarity?: number
}

class FaceRecognitionSupabaseAdapter {
  private static instance: FaceRecognitionSupabaseAdapter | null = null
  
  private constructor() {}
  
  static getInstance(): FaceRecognitionSupabaseAdapter {
    if (!FaceRecognitionSupabaseAdapter.instance) {
      FaceRecognitionSupabaseAdapter.instance = new FaceRecognitionSupabaseAdapter()
    }
    return FaceRecognitionSupabaseAdapter.instance
  }
  
  /**
   * Initialize face recognition models
   */
  async initialize(): Promise<void> {
    await faceRecognitionService.initialize()
  }
  
  /**
   * Authenticate user with face recognition
   */
  async authenticateWithFace(videoElement: HTMLVideoElement): Promise<FaceAuthResult> {
    try {
      // Get all active users with face descriptors
      const { data: users, error } = await getSupabase()
        .from('roleplay_users')
        .select(`
          *,
          roleplay_roles (
            role_code,
            role_name_zh,
            role_name_en
          )
        `)
        .not('face_descriptor', 'is', null)
        .eq('is_active', true)
      
      if (error || !users || users.length === 0) {
        return {
          success: false,
          error: '没有找到已注册人脸的用户'
        }
      }
      
      // Find best match using existing face recognition service
      const result = await faceRecognitionService.findBestMatch(
        videoElement,
        users,
        { fastMode: false }
      )
      
      if (!result.isMatch || !result.user) {
        return {
          success: false,
          error: '人脸识别失败，请重试',
          similarity: result.similarity
        }
      }
      
      // Login with matched user
      const roleData = Array.isArray(result.user.roleplay_roles)
        ? result.user.roleplay_roles[0]
        : result.user.roleplay_roles
      
      await authHybridService.loginWithFaceRecognition({
        id: result.user.id,
        email: result.user.email || `${result.user.username}@restaurant.local`,
        displayName: result.user.full_name,
        role: roleData?.role_name_zh || '',
        roleCode: roleData?.role_code || '',
        restaurantId: result.user.restaurant_id
      })
      
      return {
        success: true,
        user: result.user,
        similarity: result.similarity
      }
    } catch (error: any) {
      console.error('Face authentication failed:', error)
      return {
        success: false,
        error: error.message || '人脸识别失败'
      }
    }
  }
  
  /**
   * Enroll user's face
   */
  async enrollFace(userId: string, videoElement: HTMLVideoElement): Promise<FaceAuthResult> {
    try {
      // Use existing face recognition service to capture descriptor
      const descriptors = await faceRecognitionService.captureFaceDescriptors(
        videoElement,
        { captureAngles: true }
      )
      
      if (!descriptors || descriptors.length === 0) {
        return {
          success: false,
          error: '未能捕获人脸特征'
        }
      }
      
      // Store face descriptor in database
      const { error } = await getSupabase()
        .from('roleplay_users')
        .update({
          face_descriptor: descriptors,
          face_enrolled_at: new Date().toISOString()
        })
        .eq('id', userId)
      
      if (error) {
        return {
          success: false,
          error: '保存人脸数据失败'
        }
      }
      
      return {
        success: true
      }
    } catch (error: any) {
      console.error('Face enrollment failed:', error)
      return {
        success: false,
        error: error.message || '人脸注册失败'
      }
    }
  }
  
  /**
   * Verify user's face against stored descriptor
   */
  async verifyFace(userId: string, videoElement: HTMLVideoElement): Promise<FaceAuthResult> {
    try {
      const result = await faceRecognitionService.verifyUserFace(videoElement, userId)
      
      return {
        success: result.isMatch,
        similarity: result.similarity,
        error: result.isMatch ? undefined : '人脸验证失败'
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '人脸验证失败'
      }
    }
  }
  
  /**
   * Clear user's face data
   */
  async clearFaceData(userId: string): Promise<void> {
    await faceRecognitionService.clearUserFaceData(userId)
  }
  
  /**
   * Check if face models are loaded
   */
  isReady(): boolean {
    return faceRecognitionService.areModelsLoaded()
  }
}

// Export singleton
export const faceRecognitionSupabaseAdapter = FaceRecognitionSupabaseAdapter.getInstance()