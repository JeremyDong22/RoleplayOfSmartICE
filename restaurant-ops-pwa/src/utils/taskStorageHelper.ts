// 任务存储辅助函数 - 根据不同任务类型处理存储
// Created: 2025-07-23

import { supabase } from '../services/supabase'

// 任务类型定义
export type TaskType = 'photo' | 'record' | 'list' | 'audio'

// 任务提交数据结构
export interface TaskSubmission {
  taskId: string
  taskType: TaskType
  timeSlot: string
  content: any
  mediaFiles?: File[]
}

// 根据任务类型存储数据
export async function submitTask(submission: TaskSubmission) {
  const { taskType, content, mediaFiles } = submission
  const userId = (await supabase.auth.getUser()).data.user?.id
  const date = new Date().toISOString().split('T')[0]
  
  let mediaUrls: string[] = []
  
  // 1. 根据任务类型上传媒体文件
  if (mediaFiles && mediaFiles.length > 0) {
    mediaUrls = await uploadMediaByType(taskType, mediaFiles, userId!, date)
  }
  
  // 2. 存储到数据库
  const { data, error } = await supabase
    .from('roleplay_daily_submissions')
    .insert({
      user_id: userId,
      user_role: getCurrentUserRole(),
      submission_date: date,
      time_slot: submission.timeSlot,
      task_type: taskType,
      content: content,
      media_urls: mediaUrls
    })
  
  if (error) throw error
  return data
}

// 根据任务类型上传媒体文件
async function uploadMediaByType(
  taskType: TaskType,
  files: File[],
  userId: string,
  date: string
): Promise<string[]> {
  const urls: string[] = []
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const fileExt = file.name.split('.').pop()
    
    // 根据任务类型确定存储路径
    let path = ''
    switch (taskType) {
      case 'photo':
        path = `photos/${date}/${userId}/${Date.now()}_${i}.${fileExt}`
        break
      case 'audio':
        path = `audio/${date}/${userId}/${Date.now()}.${fileExt}`
        break
      case 'record':
      case 'list':
        path = `documents/${date}/${userId}/${Date.now()}_${taskType}.${fileExt}`
        break
    }
    
    // 上传文件
    const { data, error } = await supabase.storage
      .from('RolePlay')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) throw error
    
    // 获取公开URL
    const { data: { publicUrl } } = supabase.storage
      .from('RolePlay')
      .getPublicUrl(path)
    
    urls.push(publicUrl)
  }
  
  return urls
}

// 获取当前用户角色
function getCurrentUserRole(): string {
  // 从store或context获取
  return 'Manager' // 示例
}

// 任务类型配置
export const TASK_TYPE_CONFIG = {
  photo: {
    name: '拍照任务',
    icon: '📷',
    acceptedFormats: ['.jpg', '.jpeg', '.png'],
    maxFiles: 5,
    maxSizePerFile: 5 * 1024 * 1024 // 5MB
  },
  record: {
    name: '记录任务',
    icon: '📝',
    acceptedFormats: ['.txt', '.json'],
    maxFiles: 1,
    maxSizePerFile: 1 * 1024 * 1024 // 1MB
  },
  list: {
    name: '列表任务',
    icon: '📋',
    acceptedFormats: ['.json'],
    maxFiles: 1,
    maxSizePerFile: 1 * 1024 * 1024 // 1MB
  },
  audio: {
    name: '录音任务',
    icon: '🎙️',
    acceptedFormats: ['.mp3', '.wav', '.m4a'],
    maxFiles: 1,
    maxSizePerFile: 10 * 1024 * 1024 // 10MB
  }
}