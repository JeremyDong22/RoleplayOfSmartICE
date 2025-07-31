// 任务提交辅助函数
// Created: 2025-07-29
// 处理任务数据的上传，包括照片、音频等媒体文件

import { submitTaskRecord } from '../services/taskRecordService'
import { uploadPhoto, uploadAudio } from '../services/storageService'

interface TaskSubmissionData {
  taskId: string
  userId: string
  restaurantId: string
  date: string
  periodId: string
  uploadRequirement?: string | null
  data?: any
}

/**
 * 处理任务提交，包括媒体文件上传
 */
export async function submitTaskWithMedia({
  taskId,
  userId,
  restaurantId,
  date,
  periodId,
  uploadRequirement,
  data
}: TaskSubmissionData) {
  try {
    console.log('[TaskSubmissionHelper] ===== SUBMISSION START =====');
    console.log('[TaskSubmissionHelper] Processing task submission:', {
      taskId,
      userId,
      restaurantId,
      date,
      periodId,
      uploadRequirement,
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : [],
      dataContent: data
    })

    // 准备提交数据
    const submissionData: any = {
      user_id: userId,
      restaurant_id: restaurantId,
      task_id: taskId,
      date,
      period_id: periodId,
      submission_metadata: data
    }
    
    console.log('[TaskSubmissionHelper] Initial submission data:', {
      user_id: userId,
      restaurant_id: restaurantId,
      task_id: taskId,
      date,
      period_id: periodId
    });

    // 根据上传需求类型处理数据
    if (uploadRequirement === '拍照' && data?.evidence) {
      submissionData.submission_type = 'photo'
      submissionData.photo_urls = []
      
      // 上传照片到Storage
      for (const item of data.evidence) {
        const photoData = item.photo || item.image
        if (photoData && photoData.startsWith('data:')) {
          console.log('[TaskSubmissionHelper] Uploading photo for task:', taskId)
          const result = await uploadPhoto(photoData, userId, taskId)
          if (result) {
            submissionData.photo_urls.push(result.publicUrl)
          } else {
            console.error('[TaskSubmissionHelper] Failed to upload photo')
          }
        } else if (photoData && photoData.startsWith('http')) {
          // 已经是URL，直接使用
          submissionData.photo_urls.push(photoData)
        }
      }
      
      // 添加描述文本
      if (data.evidence[0]?.description) {
        submissionData.text_content = data.evidence[0].description
      }
    } else if (uploadRequirement === '录音' && data?.audioBlob) {
      submissionData.submission_type = 'audio'
      
      // 上传音频到Storage
      console.log('[TaskSubmissionHelper] Uploading audio for task:', taskId)
      const result = await uploadAudio(data.audioBlob, userId, taskId)
      if (result) {
        submissionData.audio_url = result.publicUrl
      } else {
        console.error('[TaskSubmissionHelper] Failed to upload audio')
      }
    } else if (uploadRequirement === '记录' && data?.textInput) {
      submissionData.submission_type = 'text'
      submissionData.text_content = data.textInput
    } else if (uploadRequirement === '列表' && data) {
      submissionData.submission_type = 'list'
      submissionData.text_content = JSON.stringify(data)
    } else {
      // 普通任务，无需上传
      console.log('[TaskSubmissionHelper] Regular task without upload requirement');
      submissionData.submission_type = null
    }

    // 提交到数据库
    console.log('[TaskSubmissionHelper] Final submission data before database:', {
      taskId,
      submissionType: submissionData.submission_type,
      hasPhotos: submissionData.photo_urls?.length || 0,
      hasAudio: !!submissionData.audio_url,
      fullData: submissionData
    })
    
    console.log('[TaskSubmissionHelper] Calling submitTaskRecord...');
    const result = await submitTaskRecord(submissionData)
    console.log('[TaskSubmissionHelper] Submission successful:', result.id)
    console.log('[TaskSubmissionHelper] ===== SUBMISSION END =====');
    
    return result
  } catch (error) {
    console.error('[TaskSubmissionHelper] Error submitting task:', {
      taskId,
      error,
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}