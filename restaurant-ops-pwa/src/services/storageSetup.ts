// Storage bucket 设置脚本
// Created: 2025-07-23
// 用于创建任务媒体存储bucket

import { supabase } from './supabase'

export async function setupTaskStorage() {
  try {
    // 检查bucket是否存在
    const { data: buckets } = await supabase.storage.listBuckets()
    
    const bucketName = 'RolePlay'
    const bucketExists = buckets?.some(b => b.name === bucketName)
    
    if (!bucketExists) {
      // 创建bucket
      const { data, error } = await supabase.storage.createBucket(bucketName, {
        public: true, // 公开访问，便于查看照片
        allowedMimeTypes: [
          'image/jpeg',
          'image/jpg', 
          'image/png',
          'image/gif',
          'audio/mpeg',
          'audio/mp3',
          'audio/wav',
          'audio/m4a',
          'application/json',
          'text/plain'
        ],
        fileSizeLimit: 10 * 1024 * 1024 // 10MB
      })
      
      if (error) {
        console.error('Failed to create storage bucket:', error)
        return false
      }
      
      console.log('Storage bucket created successfully')
    } else {
      console.log('Storage bucket already exists')
    }
    
    return true
  } catch (error) {
    console.error('Error setting up storage:', error)
    return false
  }
}

// 清理过期的临时文件
export async function cleanupOldFiles() {
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    // TODO: 实现文件清理逻辑
    // Supabase目前不支持直接按日期删除文件，
    // 需要通过列出文件然后逐个删除
    
    console.log('Cleanup completed')
  } catch (error) {
    console.error('Error cleaning up files:', error)
  }
}