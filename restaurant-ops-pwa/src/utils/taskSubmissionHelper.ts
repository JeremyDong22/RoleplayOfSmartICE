// 任务提交辅助函数
// Created: 2025-07-29
// 处理任务数据的上传，包括照片、音频等媒体文件
// Updated: 2025-08-05 - Added retry mechanism and progress tracking for better reliability
// Updated: 2025-08-11 - Added inventory update support for structured fields
// Updated: 2025-08-21 - Added parallel upload with smart fallback (10→7→5→3)

import { submitTaskRecord } from '../services/taskRecordService'
import { uploadPhoto, uploadAudio } from '../services/storageService'
import { compressImage, needsCompression, formatFileSize, estimateFileSize } from './imageCompressor'
import { uploadQueueService } from '../services/uploadQueueService'

// Fixed batch size - no fallback
const BATCH_SIZES = [5]  // Only batch of 5, no retry with different sizes
const UPLOAD_TIMEOUT = 60000 // 60 seconds per batch - increased for slow networks

// Track ongoing submissions to prevent duplicates
const ongoingSubmissions = new Set<string>()

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
  index?: number
}

/**
 * Uploads a photo WITHOUT retry - single attempt only
 */
async function uploadPhotoWithRetry(
  photoData: string,
  userId: string,
  taskId: string,
  maxRetries: number = 2, // Ignored - no retries
  onProgress?: (message: string) => void
): Promise<UploadResult> {
  try {
    // Compress if needed with network-aware settings
    let processedPhoto = photoData
    if (needsCompression(photoData, 800)) {
      onProgress?.('压缩图片中...')
      processedPhoto = await compressImage(photoData, {
        autoQuality: true // Enable network-aware compression
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
        retryCount: 0
      }
    } else {
      throw new Error('Upload returned null')
    }
  } catch (error) {
    console.error('Upload failed (no retry):', error)
    return {
      success: false,
      error: (error as Error).message,
      retryCount: 0
    }
  }
}

/**
 * Upload a batch of photos with timeout
 */
async function uploadBatchWithTimeout(
  batch: any[],
  userId: string,
  taskId: string,
  timeout: number = UPLOAD_TIMEOUT
): Promise<UploadResult[]> {
  return Promise.race([
    // Parallel upload all photos in batch
    Promise.all(
      batch.map(async (item, index) => {
        const photoData = item.photo || item.image
        try {
          const result = await uploadPhotoWithRetry(
            photoData,
            userId,
            taskId,
            2 // maxRetries - reduced from 3 to 2 as requested
          )
          return { ...result, index }
        } catch (error: any) {
          return { 
            success: false, 
            error: error.message,
            index 
          }
        }
      })
    ),
    
    // Timeout promise
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Upload timeout')), timeout)
    )
  ])
}

/**
 * Upload photos in fixed batches of 5 - NO FALLBACK
 */
async function uploadPhotosWithFallback(
  photos: any[],
  userId: string,
  taskId: string,
  onProgress?: (progress: number, message?: string) => void
): Promise<UploadResult[]> {
  const FIXED_BATCH_SIZE = 5
  let allResults: UploadResult[] = []
  let photoIndex = 0
  
  while (photoIndex < photos.length) {
    const batch = photos.slice(photoIndex, photoIndex + FIXED_BATCH_SIZE)
    
    try {
      const batchResults = await uploadBatchWithTimeout(
        batch,
        userId,
        taskId,
        UPLOAD_TIMEOUT
      )
      
      // Accept whatever results we get - no retry
      allResults.push(...batchResults)
      photoIndex += batch.length
      
      // Update progress
      if (onProgress) {
        const progress = Math.round((photoIndex / photos.length) * 100)
        const successCount = allResults.filter(r => r.success).length
        const failureCount = allResults.filter(r => !r.success).length
        let message = `正在上传 ${photoIndex}/${photos.length} 张照片`
        if (failureCount > 0) {
          message += ` (${failureCount} 张失败)`
        }
        onProgress(progress, message)
      }
      
    } catch (error: any) {
      console.error('[Upload] Batch failed, not retrying:', error)
      // If batch fails completely, just stop - no retry
      throw new Error('照片上传失败，请检查网络连接')
    }
  }
  
  return allResults
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
  maxRetries = 2
}: TaskSubmissionData) {
  // Prevent duplicate submissions - include periodId to avoid date-based duplicates
  const submissionKey = `${taskId}-${userId}-${date}-${periodId}`
  if (ongoingSubmissions.has(submissionKey)) {
    console.warn('[TaskSubmissionHelper] Duplicate submission prevented for:', submissionKey)
    throw new Error('任务正在提交中，请勿重复操作')
  }
  
  // Mark submission as ongoing
  ongoingSubmissions.add(submissionKey)
  
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

    // 准备提交数据 - 不要在metadata里存储原始照片数据
    const cleanedData = { ...data }
    
    // 移除原始照片数据，只保留其他元数据
    if (cleanedData.evidence) {
      // 清理evidence中的照片数据，只保留描述等信息
      if (Array.isArray(cleanedData.evidence)) {
        cleanedData.evidence = cleanedData.evidence.map(item => ({
          ...item,
          photo: undefined,
          image: undefined,
          description: item.description,
          sampleIndex: item.sampleIndex
        }))
      } else if (cleanedData.evidence.evidence) {
        // 嵌套格式
        cleanedData.evidence = {
          ...cleanedData.evidence,
          evidence: cleanedData.evidence.evidence.map((item: any) => ({
            ...item,
            photo: undefined,
            image: undefined,
            description: item.description,
            sampleIndex: item.sampleIndex
          }))
        }
      }
    }
    
    // 保留photoGroups结构，稍后会用上传后的URL替换原始照片数据
    let photoGroupsStructure: any[] | undefined = undefined
    if (cleanedData.photoGroups) {
      // 先保存结构，用于后续恢复
      photoGroupsStructure = cleanedData.photoGroups.map((group: any) => ({
        ...group,
        photos: [] // 临时清空，稍后填充URL
      }))
    }
    
    // 提取structured_data到顶层（用于备餐等结构化任务）
    const { structured_data, ...metadataWithoutStructuredData } = cleanedData

    const submissionData: any = {
      user_id: userId,
      restaurant_id: restaurantId,
      task_id: taskId,
      date,
      period_id: periodId,
      submission_metadata: metadataWithoutStructuredData,
      ...(structured_data && { structured_data }) // 如果有structured_data则添加到顶层
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
      
      // 首先检查photoGroups（值班经理可能使用这个格式）
      if (data.photoGroups && Array.isArray(data.photoGroups)) {
        console.log('[TaskSubmissionHelper] Found photoGroups format:', data.photoGroups)
        // 将photoGroups转换为evidence格式
        evidenceArray = []
        data.photoGroups.forEach((group: any) => {
          if (group.photos && Array.isArray(group.photos)) {
            group.photos.forEach((photo: string) => {
              // photoGroups格式中，照片应该是字符串数组（PhotoSubmissionDialog发送的格式）
              // 验证是有效的base64数据
              if (photo && typeof photo === 'string' && photo.startsWith('data:')) {
                console.log('[TaskSubmissionHelper] Photo data type:', typeof photo)
                console.log('[TaskSubmissionHelper] Photo data starts with:', photo.substring(0, 50))
                evidenceArray.push({ photo: photo, description: group.comment || '' })
              } else {
                console.error('[TaskSubmissionHelper] Invalid photo data:', typeof photo, photo?.substring?.(0, 50))
              }
            })
          }
        })
      } else if (data.evidence) {
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
      
      console.log('[TaskSubmissionHelper] Evidence array:', evidenceArray)
      
      // NEW: Parallel upload with fallback
      if (evidenceArray.length > 0) {
        const photosToUpload = evidenceArray.filter(item => {
          const photoData = item.photo || item.image
          return photoData && photoData.startsWith('data:')
        })
        
        const existingUrls = evidenceArray.filter(item => {
          const photoData = item.photo || item.image
          return photoData && photoData.startsWith('http')
        }).map(item => item.photo || item.image)
        
        if (photosToUpload.length > 0) {
          try {
            const uploadResults = await uploadPhotosWithFallback(
              photosToUpload,
              userId,
              taskId,
              onProgress
            )
            
            // Collect successful URLs
            const newUrls = uploadResults
              .filter(r => r.success && r.url)
              .map(r => r.url!)
            
            submissionData.photo_urls = [...existingUrls, ...newUrls]
            
            // 如果有photoGroups结构，重建带URL的photoGroups
            if (photoGroupsStructure && data.photoGroups) {
              let urlIndex = 0
              const allUrls = [...existingUrls, ...newUrls]
              
              // 重建photoGroups，用URL替换原始的base64数据
              photoGroupsStructure = data.photoGroups.map((group: any) => {
                const groupWithUrls = {
                  ...group,
                  photos: [] as string[]
                }
                
                // 为每个组的照片分配对应的URL
                if (group.photos && Array.isArray(group.photos)) {
                  group.photos.forEach(() => {
                    if (urlIndex < allUrls.length) {
                      groupWithUrls.photos.push(allUrls[urlIndex])
                      urlIndex++
                    }
                  })
                }
                
                return groupWithUrls
              })
              
              // 保存重建的photoGroups到submission_metadata
              submissionData.submission_metadata.photoGroups = photoGroupsStructure
            }
            
            // Check if all uploads succeeded
            const failures = uploadResults.filter(r => !r.success)
            if (failures.length > 0) {
              console.error(`[Upload] ${failures.length} photos failed to upload`)
              // If ALL photos failed, throw error to prevent saving empty data
              if (newUrls.length === 0 && existingUrls.length === 0) {
                throw new Error(`所有照片上传失败，请检查网络连接后重试`)
              }
              // If some succeeded, continue with partial upload
            }
            
            // Update final progress
            onProgress?.(100, `完成 ${newUrls.length}/${photosToUpload.length} 张照片上传`)
            
          } catch (uploadError: any) {
            console.error('[Upload] Error:', uploadError)
            
            if (uploadError.message.includes('timeout')) {
              throw new Error('上传超时（60秒），网络连接缓慢，请稍后重试')
            } else if (uploadError.message.includes('网络连接异常')) {
              throw uploadError
            } else {
              throw new Error('照片上传失败，请检查网络连接后重试')
            }
          }
        } else {
          // All photos are already URLs
          submissionData.photo_urls = existingUrls
        }
      }
      
      // 添加描述文本
      if (evidenceArray.length > 0 && evidenceArray[0]?.description) {
        submissionData.text_content = evidenceArray[0].description
      }
      
      // 处理结构化数据（收货验货、损耗等）- 统一格式
      if (data.structured_data) {
        // 判断action_type
        let actionType = 'receipt' // 默认为收货
        if (data.structured_data.reason) {
          // 有损耗原因字段
          if (data.structured_data.reason.includes('交割')) {
            actionType = 'processing_loss'
          } else {
            actionType = 'loss'
          }
        } else if (data.structured_data.quality_check) {
          actionType = 'receipt'
        }
        
        // 转换为统一的多物品格式
        const unifiedData = {
          action_type: actionType,
          items: Array.isArray(data.structured_data.items) 
            ? data.structured_data.items  // 如果已经是items数组格式
            : [{  // 转换单个物品为数组格式
                item_name: data.structured_data.item_name,
                quantity: data.structured_data.quantity,
                unit: data.structured_data.unit,
                unit_price: data.structured_data.unit_price,
                total_price: data.structured_data.total_price,
                quality_check: data.structured_data.quality_check,
                loss_reason: data.structured_data.reason
              }],
          notes: data.note || evidenceArray?.[0]?.description || ''
        }
        
        // 计算总金额（如果有多个物品）
        if (unifiedData.items.length > 0) {
          const totalAmount = unifiedData.items.reduce((sum, item) => {
            return sum + (item.total_price || 0)
          }, 0)
          if (totalAmount > 0) {
            unifiedData.total_amount = totalAmount
          }
        }
        
        // 保存统一格式的元数据
        submissionData.submission_metadata = {
          ...submissionData.submission_metadata,
          structured_data: unifiedData
        }
        
        // 生成可读文本格式供显示
        const structuredTextArray = []
        unifiedData.items.forEach((item, index) => {
          const itemTexts = []
          if (item.item_name) {
            itemTexts.push(`物品${unifiedData.items.length > 1 ? index + 1 : ''}: ${item.item_name}`)
          }
          if (item.quantity && item.unit) {
            itemTexts.push(`数量: ${item.quantity} ${item.unit}`)
          } else if (item.quantity) {
            itemTexts.push(`数量: ${item.quantity}`)
          }
          
          // 价格信息
          if (item.unit_price) {
            itemTexts.push(`单价: ¥${item.unit_price}`)
          }
          if (item.total_price) {
            const priceLabel = actionType === 'loss' || actionType === 'processing_loss' ? '损耗价值' : '总价'
            itemTexts.push(`${priceLabel}: ¥${item.total_price}`)
          }
          
          // 质量检查或损耗原因
          if (item.quality_check) {
            itemTexts.push(`质量检查: ${item.quality_check}`)
          }
          if (item.loss_reason) {
            itemTexts.push(`损耗原因: ${item.loss_reason}`)
          }
          
          structuredTextArray.push(itemTexts.join(', '))
        })
        
        // 合并文本
        let finalText = structuredTextArray.join('\n')
        if (unifiedData.notes) {
          finalText += `\n备注: ${unifiedData.notes}`
        }
        submissionData.text_content = finalText
        
        // 日志记录（不再直接更新库存）
        console.log('[TaskSubmissionHelper] Processing inventory action:', {
          action: actionType,
          itemCount: unifiedData.items.length,
          totalAmount: unifiedData.total_amount
        })
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
      // 处理结构化文本输入（如损耗盘点）- 统一格式
      submissionData.submission_type = 'text'
      
      // 判断action_type - 如果已经有action_type则使用，否则根据字段判断
      let actionType = data.structured_data.action_type || 'loss' // 优先使用传入的action_type
      if (!data.structured_data.action_type) {
        // 只有在没有明确action_type时才自动判断
        if (data.structured_data.reason) {
          if (data.structured_data.reason.includes('交割')) {
            actionType = 'processing_loss'
          } else {
            actionType = 'loss'
          }
        } else if (data.structured_data.quality_check) {
          actionType = 'receipt'
        }
      }
      
      // 转换为统一的多物品格式
      const unifiedData = {
        action_type: actionType,
        items: Array.isArray(data.structured_data.items) 
          ? data.structured_data.items  // 如果已经是items数组格式
          : [{  // 转换单个物品为数组格式
              item_name: data.structured_data.item_name,
              quantity: data.structured_data.quantity,
              unit: data.structured_data.unit,
              unit_price: data.structured_data.unit_price,
              total_price: data.structured_data.total_price,
              quality_check: data.structured_data.quality_check,
              loss_reason: data.structured_data.reason
            }],
        notes: data.note || ''
      }
      
      // 计算总金额（如果有多个物品）
      if (unifiedData.items.length > 0) {
        const totalAmount = unifiedData.items.reduce((sum, item) => {
          return sum + (item.total_price || 0)
        }, 0)
        if (totalAmount > 0) {
          unifiedData.total_amount = totalAmount
        }
      }
      
      // 保存统一格式的元数据
      submissionData.submission_metadata = {
        ...submissionData.submission_metadata,
        structured_data: unifiedData
      }
      
      // 生成可读文本格式供显示
      const structuredTextArray = []
      unifiedData.items.forEach((item, index) => {
        const itemTexts = []
        if (item.item_name) {
          itemTexts.push(`物品${unifiedData.items.length > 1 ? index + 1 : ''}: ${item.item_name}`)
        }
        if (item.quantity && item.unit) {
          itemTexts.push(`数量: ${item.quantity} ${item.unit}`)
        } else if (item.quantity) {
          itemTexts.push(`数量: ${item.quantity}`)
        }
        
        // 价格信息
        if (item.unit_price) {
          itemTexts.push(`单价: ¥${item.unit_price}`)
        }
        if (item.total_price) {
          const priceLabel = actionType === 'loss' || actionType === 'processing_loss' ? '损耗价值' : '总价'
          itemTexts.push(`${priceLabel}: ¥${item.total_price}`)
        }
        
        // 损耗原因
        if (item.loss_reason) {
          itemTexts.push(`损耗原因: ${item.loss_reason}`)
        }
        
        structuredTextArray.push(itemTexts.join(', '))
      })
      
      // 合并文本
      let finalText = structuredTextArray.join('\n')
      if (unifiedData.notes) {
        finalText += `\n备注: ${unifiedData.notes}`
      }
      submissionData.text_content = finalText
      
      // 日志记录（不再直接更新库存）
      console.log('[TaskSubmissionHelper] Processing inventory action:', {
        action: actionType,
        itemCount: unifiedData.items.length,
        totalAmount: unifiedData.total_amount
      })
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
    
    // Add mobile network detection
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      const effectiveType = connection.effectiveType;
      console.log('[TaskSubmissionHelper] Network type:', effectiveType);
      
      // Show warning for slow connections
      if (effectiveType === '2g' || effectiveType === 'slow-2g') {
        onProgress?.(85, '检测到较慢的网络，可能需要更长时间...');
      }
    }
    
    // Single submission attempt with timeout protection
    try {
      onProgress?.(90, '保存任务记录...')

      // Add timeout protection for database submission
      const submitWithTimeout = Promise.race([
        submitTaskRecord(submissionData),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Database submission timeout')), UPLOAD_TIMEOUT)
        )
      ])

      const result = await submitWithTimeout
      console.log('[TaskSubmissionHelper] Submission successful:', result.id)
      console.log('[TaskSubmissionHelper] ===== SUBMISSION END =====');

      // Keep submissionKey for 30 seconds to prevent rapid re-submissions
      setTimeout(() => {
        ongoingSubmissions.delete(submissionKey)
        console.log('[TaskSubmissionHelper] Cleared submission key after cooldown:', submissionKey)
      }, 30000) // 30 second cooldown

      onProgress?.(100, '提交成功!')
      return result
    } catch (error: any) {
      console.error('[TaskSubmissionHelper] Submit failed:', error)
      // Important: DO NOT continue past this point if submission succeeded
      // The error here means submission actually failed or timed out

      // Store error for later use
      const submissionError = error

      console.error('[TaskSubmissionHelper] Adding to queue for retry')

      // Add to upload queue for background retry - ALWAYS save data on failure
      await uploadQueueService.addToQueue({
        taskId,
        userId,
        restaurantId,
        date,
        periodId,
        uploadRequirement,
        data
      })

      // Throw error to indicate immediate failure (but data is queued)
      const errorMessage = submissionError?.message || 'Failed to submit task'
      // Keep submissionKey for 5 seconds on error to prevent rapid retries
      setTimeout(() => {
        ongoingSubmissions.delete(submissionKey)
        console.log('[TaskSubmissionHelper] Cleared submission key after error cooldown:', submissionKey)
      }, 5000) // 5 second cooldown on error

      // Provide clear feedback based on error type
      if (errorMessage.includes('timeout')) {
        throw new Error(`提交超时（60秒），任务已保存并将在网络恢复后自动重试`)
      } else {
        throw new Error(`${errorMessage}. 任务已保存并将在网络恢复后自动重试`)
      }
    }
  } catch (error) {
    // Keep submissionKey for 5 seconds on error to prevent rapid retries
    setTimeout(() => {
      ongoingSubmissions.delete(submissionKey)
      console.log('[TaskSubmissionHelper] Cleared submission key after outer error cooldown:', submissionKey)
    }, 5000) // 5 second cooldown on error

    console.error('[TaskSubmissionHelper] Error submitting task:', {
      taskId,
      error,
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    
    // Try to add to queue even if main submission failed
    try {
      await uploadQueueService.addToQueue({
        taskId,
        userId,
        restaurantId,
        date,
        periodId,
        uploadRequirement,
        data
      })
      
      // Modify error message to indicate queued status
      const originalMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`${originalMessage}. Task has been queued for automatic retry.`)
    } catch (queueError) {
      console.error('[TaskSubmissionHelper] Failed to add to queue:', queueError)
      // If even queuing fails, throw original error
      throw error
    }
  }
}