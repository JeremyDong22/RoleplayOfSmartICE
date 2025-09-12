/**
 * Storage Service for handling photo uploads to Supabase Storage
 * 
 * This service provides functionality to:
 * - Upload photos to Supabase Storage bucket
 * - Generate unique file names with structured paths
 * - Convert base64 images to ArrayBuffer (per Supabase docs)
 * - Return public URLs for uploaded files
 * 
 * Created: 2025-01-23
 * Updated: 2025-09-12 - Changed from Blob to ArrayBuffer approach
 */

import { supabase } from './supabase';
import { decode } from 'base64-arraybuffer';

// Constants
const BUCKET_NAME = 'RolePlay';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

// Note: We're using ArrayBuffer approach instead of Blob
// as recommended in Supabase documentation:
// https://supabase.com/docs/reference/javascript/storage-from-upload

/**
 * Generates a unique file path for storing photos
 * @param userId - The ID of the user uploading the photo
 * @param taskId - The ID of the task associated with the photo
 * @param date - The date of the upload (optional, defaults to current date)
 * @returns Formatted file path string
 */
function generateFilePath(userId: string, taskId: string, date?: Date): string {
  const uploadDate = date || new Date();
  const dateStr = uploadDate.toISOString().split('T')[0]; // YYYY-MM-DD format
  const timestamp = uploadDate.getTime();
  const randomId = Math.random().toString(36).substring(2, 8); // Add random ID to ensure uniqueness
  
  // Create path following new structure: photos/date/taskId_timestamp_randomId.jpg
  return `photos/${dateStr}/${taskId}_${timestamp}_${randomId}.jpg`;
}

/**
 * Uploads a photo to Supabase Storage
 * @param base64Image - The base64 encoded image string
 * @param userId - The ID of the user uploading the photo
 * @param taskId - The ID of the task associated with the photo
 * @param metadata - Optional metadata to store with the file
 * @returns Object containing the public URL and file path, or null if upload fails
 */
export async function uploadPhoto(
  base64Image: string,
  userId: string,
  taskId: string,
  metadata?: Record<string, any>
): Promise<{ publicUrl: string; filePath: string } | null> {
  try {
    // Validate inputs
    if (!base64Image || !userId || !taskId) {
      throw new Error('Missing required parameters for photo upload');
    }
    
    // Log the type of data we're receiving for debugging
    console.log('[StorageService] Received data type:', typeof base64Image);
    console.log('[StorageService] Data starts with:', base64Image.substring(0, 100));
    
    // Ensure we have valid base64 image data
    if (!base64Image.startsWith('data:image/')) {
      console.error('[StorageService] Invalid image data format - not a data URI');
      throw new Error('Invalid image data format');
    }
    
    // Extract content type from data URI
    const contentTypeMatch = base64Image.match(/^data:(image\/\w+);base64,/);
    const contentType = contentTypeMatch ? contentTypeMatch[1] : 'image/jpeg';
    
    // Remove data URI prefix to get pure base64
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    
    // Convert base64 to ArrayBuffer using base64-arraybuffer library
    const arrayBuffer = decode(base64Data);
    
    // Check file size
    if (arrayBuffer.byteLength > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
    
    // Generate unique file path
    const filePath = generateFilePath(userId, taskId);
    const fileName = filePath.split('/').pop() || 'photo.jpg';
    
    // Create a File object from ArrayBuffer
    // Supabase expects File or Blob, not raw ArrayBuffer
    const file = new File([arrayBuffer], fileName, { type: contentType });
    
    console.log('[StorageService] Created File from ArrayBuffer:', {
      name: file.name,
      size: file.size,
      type: file.type,
      contentType
    });
    
    // Upload to Supabase Storage using File object
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        contentType: contentType,
        cacheControl: '3600',
        upsert: false, // Don't overwrite existing files
        metadata: {
          userId,
          taskId,
          uploadedAt: new Date().toISOString(),
          ...metadata
        }
      });
    
    if (error) {
      console.error('[StorageService] Upload error:', error);
      console.error('[StorageService] Error details:', {
        message: error.message,
        statusCode: (error as any).statusCode,
        error: error
      });
      throw new Error(`Failed to upload photo: ${error.message}`);
    }
    
    // Get public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);
    
    console.log(`[StorageService] Photo uploaded successfully`);
    
    return {
      publicUrl,
      filePath
    };
  } catch (error) {
    console.error('Failed to upload photo:', error);
    return null;
  }
}

/**
 * Uploads multiple photos in batch
 * @param photos - Array of photos with their associated data
 * @returns Array of upload results
 */
export async function uploadPhotoBatch(
  photos: Array<{
    base64Image: string;
    userId: string;
    taskId: string;
    metadata?: Record<string, any>;
  }>
): Promise<Array<{ publicUrl: string; filePath: string } | null>> {
  const uploadPromises = photos.map(photo =>
    uploadPhoto(photo.base64Image, photo.userId, photo.taskId, photo.metadata)
  );
  
  try {
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('Error during batch upload:', error);
    throw error;
  }
}

/**
 * Deletes a photo from Supabase Storage
 * @param filePath - The file path of the photo to delete
 * @returns Boolean indicating success
 */
export async function deletePhoto(filePath: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);
    
    if (error) {
      console.error('Error deleting photo:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to delete photo:', error);
    return false;
  }
}

/**
 * Gets a signed URL for temporary access to a private file
 * @param filePath - The file path of the photo
 * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @returns Signed URL or null if generation fails
 */
export async function getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, expiresIn);
    
    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
    
    return data.signedUrl;
  } catch (error) {
    console.error('Failed to create signed URL:', error);
    return null;
  }
}

/**
 * Uploads an audio file to Supabase Storage
 * @param audioBlob - The audio blob data
 * @param userId - The ID of the user uploading the audio
 * @param taskId - The ID of the task associated with the audio
 * @param metadata - Optional metadata to store with the file
 * @returns Object containing the public URL and file path, or null if upload fails
 */
export async function uploadAudio(
  audioBlob: Blob,
  userId: string,
  taskId: string,
  metadata?: Record<string, any>
): Promise<{ publicUrl: string; filePath: string } | null> {
  try {
    // Validate inputs
    if (!audioBlob || !userId || !taskId) {
      throw new Error('Missing required parameters for audio upload');
    }
    
    // Check file size
    if (audioBlob.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
    
    // Generate unique file path for audio
    const uploadDate = new Date();
    const dateStr = uploadDate.toISOString().split('T')[0];
    const timestamp = uploadDate.getTime();
    const randomId = Math.random().toString(36).substring(2, 8);
    const filePath = `audio/${dateStr}/${taskId}_${timestamp}_${randomId}.m4a`;
    
    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, audioBlob, {
        contentType: 'audio/m4a',
        cacheControl: '3600',
        upsert: false,
        metadata: {
          userId,
          taskId,
          uploadedAt: new Date().toISOString(),
          ...metadata
        }
      });
    
    if (error) {
      console.error('[StorageService] Audio upload error:', error);
      throw new Error(`Failed to upload audio: ${error.message}`);
    }
    
    // Get public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);
    
    console.log(`[StorageService] Audio uploaded successfully`);
    
    return {
      publicUrl,
      filePath
    };
  } catch (error) {
    console.error('Failed to upload audio:', error);
    return null;
  }
}

/**
 * Lists all photos for a specific user and/or task
 * @param userId - Optional user ID to filter by
 * @param taskId - Optional task ID to filter by
 * @returns Array of file objects
 */
export async function listPhotos(userId?: string, taskId?: string) {
  try {
    let path = '';
    
    if (userId && taskId) {
      // List photos for specific user and task
      path = `${userId}`;
    } else if (userId) {
      // List all photos for a user
      path = userId;
    }
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(path, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });
    
    if (error) {
      console.error('Error listing photos:', error);
      return [];
    }
    
    // Filter by taskId if provided and not already in path
    if (taskId && userId) {
      return data.filter(file => file.name.includes(taskId));
    }
    
    return data;
  } catch (error) {
    console.error('Failed to list photos:', error);
    return [];
  }
}

/**
 * Creates the storage bucket if it doesn't exist
 * Note: This requires admin privileges
 */
export async function createBucketIfNotExists(): Promise<boolean> {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return false;
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
    
    if (!bucketExists) {
      // Create bucket with public access
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        fileSizeLimit: MAX_FILE_SIZE
      });
      
      if (createError) {
        console.error('Error creating bucket:', createError);
        return false;
      }
      
      console.log(`Bucket '${BUCKET_NAME}' created successfully`);
    } else {
      // Bucket already exists
    }
    
    return true;
  } catch (error) {
    console.error('Failed to create bucket:', error);
    return false;
  }
}