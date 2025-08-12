// 任务提交辅助函数
// Created: 2025-07-29
// 处理任务数据的上传，包括照片、音频等媒体文件
// Updated: 2025-08-05 - Added retry mechanism and progress tracking for better reliability
// Updated: 2025-08-11 - Added inventory update support for structured fields

import { submitTaskRecord } from '../services/taskRecordService'
import { uploadPhoto, uploadAudio } from '../services/storageService'
import { compressImage, needsCompression, formatFileSize, estimateFileSize } from './imageCompressor'

interface TaskSubmissionData {
  taskId: string
  userId: string
  restaurantId: string
  date: string
  periodId: string
  uploadRequirement?: string | null
  data?: any
  onProgress?: (progress: number, message?: string) => void
  maxRetries?: number
}

interface UploadResult {
  success: boolean
  url?: string
  error?: string
  retryCount?: number
}

/**
 * Uploads a photo with retry mechanism
 */
async function uploadPhotoWithRetry(
  photoData: string,
  userId: string,
  taskId: string,
  maxRetries: number = 3,
  onProgress?: (message: string) => void
): Promise<UploadResult> {
  let retryCount = 0
  let lastError: Error | null = null
  
  while (retryCount <= maxRetries) {
    try {
      if (retryCount > 0) {
        onProgress?.(`重试上传 (${retryCount}/${maxRetries})...`)
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, retryCount - 1), 5000)))
      }
      
      // Compress if needed
      let processedPhoto = photoData
      if (needsCompression(photoData, 800)) {
        onProgress?.('压缩图片中...')
        processedPhoto = await compressImage(photoData, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.8
        })
        const originalSize = estimateFileSize(photoData)
        const compressedSize = estimateFileSize(processedPhoto)
        console.log(`Photo compressed: ${formatFileSize(originalSize)} -> ${formatFileSize(compressedSize)}`)
      }
      
      onProgress?.('正在上传...')
      const result = await uploadPhoto(processedPhoto, userId, taskId)
      
      if (result) {
        return {
          success: true,
          url: result.publicUrl,
          retryCount
        }
      } else {
        throw new Error('Upload returned null')
      }
    } catch (error) {
      lastError = error as Error
      console.error(`Upload attempt ${retryCount + 1} failed:`, error)
      retryCount++
      
      // Don't retry for certain errors
      if (error instanceof Error) {
        if (error.message.includes('File size exceeds') ||
            error.message.includes('Invalid image')) {
          break
        }
      }
    }
  }
  
  return {
    success: false,
    error: lastError?.message || 'Upload failed after retries',
    retryCount
  }
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
  data,
  onProgress,
  maxRetries = 3
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
    
    // If there's a late submission reason, include it and mark as late
    if (data?.lateReason || data?.lateExplanation) {
      submissionData.makeup_reason = data.lateReason || data.lateExplanation
      submissionData.is_late = true
    }
    
    console.log('[TaskSubmissionHelper] Initial submission data:', {
      user_id: userId,
      restaurant_id: restaurantId,
      task_id: taskId,
      date,
      period_id: periodId
    });

    // 根据上传需求类型处理数据
    if (uploadRequirement === '拍照' && data) {
      submissionData.submission_type = 'photo'
      submissionData.photo_urls = []
      
      // 处理不同格式的evidence数据
      let evidenceArray: any[] = []
      
      if (data.evidence) {
        // 如果evidence是对象且包含evidence属性（嵌套格式）
        if (data.evidence.evidence && Array.isArray(data.evidence.evidence)) {
          evidenceArray = data.evidence.evidence
        }
        // 如果evidence直接是数组
        else if (Array.isArray(data.evidence)) {
          evidenceArray = data.evidence
        }
        // 如果data本身包含evidence属性但不是数组，可能是错误格式
        else {
          console.warn('[TaskSubmissionHelper] Evidence is not in expected format:', data.evidence)
          evidenceArray = []
        }
      }
      
      // 上传照片到Storage with retry and progress
      const totalPhotos = evidenceArray.length
      let uploadedPhotos = 0
      
      for (let i = 0; i < evidenceArray.length; i++) {
        const item = evidenceArray[i]
        const photoData = item.photo || item.image
        
        if (photoData && photoData.startsWith('data:')) {
          console.log(`[TaskSubmissionHelper] Uploading photo ${i + 1}/${totalPhotos} for task:`, taskId)
          
          // Update progress
          const progressPercent = Math.round((uploadedPhotos / totalPhotos) * 100)
          onProgress?.(progressPercent, `上传照片 ${i + 1}/${totalPhotos}`)
          
          // Upload with retry
          const uploadResult = await uploadPhotoWithRetry(
            photoData,
            userId,
            taskId,
            maxRetries,
            (msg) => onProgress?.(progressPercent, msg)
          )
          
          if (uploadResult.success && uploadResult.url) {
            submissionData.photo_urls.push(uploadResult.url)
            uploadedPhotos++
          } else {
            console.error('[TaskSubmissionHelper] Failed to upload photo after retries:', uploadResult.error)
            // Continue with other photos even if one fails
          }
        } else if (photoData && photoData.startsWith('http')) {
          // 已经是URL，直接使用
          submissionData.photo_urls.push(photoData)
          uploadedPhotos++
        }
      }
      
      // Update final progress
      if (totalPhotos > 0) {
        onProgress?.(100, `完成 ${uploadedPhotos}/${totalPhotos} 张照片上传`)
      }
      
      // 添加描述文本
      if (evidenceArray.length > 0 && evidenceArray[0]?.description) {
        submissionData.text_content = evidenceArray[0].description
      }
      
      // 处理结构化数据（收货验货）
      if (data.structured_data) {
        submissionData.submission_metadata = {
          ...submissionData.submission_metadata,
          structured_data: data.structured_data
        }
        
        // 生成可读文本格式供CEO dashboard显示
        const structuredText = []
        if (data.structured_data.item_name) {
          structuredText.push(`物品名称: ${data.structured_data.item_name}`)
        }
        if (data.structured_data.quantity && data.structured_data.unit) {
          structuredText.push(`数量: ${data.structured_data.quantity} ${data.structured_data.unit}`)
        } else if (data.structured_data.quantity) {
          structuredText.push(`数量: ${data.structured_data.quantity}`)
        }
        
        // 添加价格信息
        if (data.structured_data.unit_price && data.structured_data.total_price) {
          structuredText.push(`单价: ¥${data.structured_data.unit_price}`)
          structuredText.push(`总价: ¥${data.structured_data.total_price}`)
        } else if (data.structured_data.unit_price) {
          structuredText.push(`单价: ¥${data.structured_data.unit_price}`)
        } else if (data.structured_data.total_price) {
          structuredText.push(`总价: ¥${data.structured_data.total_price}`)
        }
        
        if (data.structured_data.quality_check) {
          structuredText.push(`质量检查: ${data.structured_data.quality_check}`)
        }
        
        // 将结构化文本与备注合并
        const finalText = structuredText.join(', ')
        const existingDescription = evidenceArray.length > 0 && evidenceArray[0]?.description 
          ? evidenceArray[0].description 
          : ''
        
        // 如果有备注，添加到结构化文本后面
        if (existingDescription) {
          submissionData.text_content = `${finalText}\n备注: ${existingDescription}`
        } else {
          submissionData.text_content = finalText
        }
        
        // 库存更新将由后端触发器处理，前端只负责格式化文本
        console.log('[TaskSubmissionHelper] Structured data formatted as text, inventory will be updated by backend trigger')
      } else if (evidenceArray.length > 0 && evidenceArray[0]?.description) {
        // 如果没有结构化数据但有描述文本，直接使用描述文本
        submissionData.text_content = evidenceArray[0].description
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
    } else if (data?.type === 'structured_text' && data?.structured_data) {
      // 处理结构化文本输入（如损耗盘点）
      submissionData.submission_type = 'text'
      
      // 生成可读文本格式供CEO dashboard显示
      const structuredText = []
      if (data.structured_data.item_name) {
        structuredText.push(`物品名称: ${data.structured_data.item_name}`)
      }
      if (data.structured_data.quantity && data.structured_data.unit) {
        structuredText.push(`数量: ${data.structured_data.quantity} ${data.structured_data.unit}`)
      } else if (data.structured_data.quantity) {
        structuredText.push(`数量: ${data.structured_data.quantity}`)
      }
      
      // 添加价格信息（损耗盘点会有FIFO计算的价格）
      if (data.structured_data.unit_price && data.structured_data.total_price) {
        structuredText.push(`单价: ¥${data.structured_data.unit_price}`)
        structuredText.push(`损耗价值: ¥${data.structured_data.total_price}`)
      } else if (data.structured_data.total_price) {
        structuredText.push(`损耗价值: ¥${data.structured_data.total_price}`)
      }
      
      // 添加损耗原因
      if (data.structured_data.reason) {
        structuredText.push(`损耗原因: ${data.structured_data.reason}`)
      }
      
      if (data.structured_data.quality_check) {
        structuredText.push(`质量检查: ${data.structured_data.quality_check}`)
      }
      
      // 将结构化文本与备注合并
      const finalText = structuredText.join(', ')
      if (data.note) {
        submissionData.text_content = `${finalText}\n备注: ${data.note}`
      } else {
        submissionData.text_content = finalText
      }
      
      submissionData.submission_metadata = {
        ...submissionData.submission_metadata,
        structured_data: data.structured_data
      }
      
      // 库存更新将由后端触发器处理，前端只负责格式化文本
      console.log('[TaskSubmissionHelper] Structured text formatted, inventory will be updated by backend trigger')
    } else if (uploadRequirement === '列表' && data) {
      submissionData.submission_type = 'list'
      submissionData.text_content = JSON.stringify(data)
    } else {
      // 普通任务，无需上传
      console.log('[TaskSubmissionHelper] Regular task without upload requirement');
      submissionData.submission_type = null
    }

    // 提交到数据库 with retry
    console.log('[TaskSubmissionHelper] Final submission data before database:', {
      taskId,
      submissionType: submissionData.submission_type,
      hasPhotos: submissionData.photo_urls?.length || 0,
      hasAudio: !!submissionData.audio_url,
      fullData: submissionData
    })
    
    console.log('[TaskSubmissionHelper] Calling submitTaskRecord...');
    
    // Retry submission if it fails
    let submitRetries = 0
    let submitError: Error | null = null
    
    while (submitRetries <= maxRetries) {
      try {
        if (submitRetries > 0) {
          onProgress?.(95, `重试提交 (${submitRetries}/${maxRetries})...`)
          await new Promise(resolve => setTimeout(resolve, 1000 * submitRetries))
        } else {
          onProgress?.(90, '保存任务记录...')
        }
        
        const result = await submitTaskRecord(submissionData)
        console.log('[TaskSubmissionHelper] Submission successful:', result.id)
        console.log('[TaskSubmissionHelper] ===== SUBMISSION END =====');
        
        onProgress?.(100, '提交成功!')
        return result
      } catch (error) {
        submitError = error as Error
        console.error(`Submit attempt ${submitRetries + 1} failed:`, error)
        submitRetries++
      }
    }
    
    // If all retries failed, throw the last error
    throw submitError || new Error('Failed to submit task after retries')
  } catch (error) {
    console.error('[TaskSubmissionHelper] Error submitting task:', {
      taskId,
      error,
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}