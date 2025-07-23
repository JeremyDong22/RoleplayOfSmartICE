/**
 * Storage Service for handling photo uploads to Supabase Storage
 * 
 * This service provides functionality to:
 * - Upload photos to Supabase Storage bucket
 * - Generate unique file names with structured paths
 * - Convert base64 images to blobs
 * - Return public URLs for uploaded files
 * 
 * Created: 2025-01-23
 */

import { supabase } from './supabase';

// Constants
const BUCKET_NAME = 'duty-manager-photos';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

/**
 * Converts a base64 string to a Blob
 * @param base64 - The base64 string (with or without data URI prefix)
 * @param contentType - The MIME type of the image (default: image/jpeg)
 * @returns Blob object
 */
function base64ToBlob(base64: string, contentType: string = 'image/jpeg'): Blob {
  // Remove data URI prefix if present
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  
  // Decode base64 string
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
}

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
  
  // Create path: userId/date/taskId/timestamp.jpg
  return `${userId}/${dateStr}/${taskId}/${timestamp}.jpg`;
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
    console.log(`[StorageService] Starting photo upload for user: ${userId}, task: ${taskId}`);
    
    // Validate inputs
    if (!base64Image || !userId || !taskId) {
      throw new Error('Missing required parameters for photo upload');
    }
    
    // Convert base64 to blob
    const blob = base64ToBlob(base64Image);
    console.log(`[StorageService] Blob created, size: ${(blob.size / 1024).toFixed(2)}KB`);
    
    // Check file size
    if (blob.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
    
    // Generate unique file path
    const filePath = generateFilePath(userId, taskId);
    console.log(`[StorageService] Generated file path: ${filePath}`);
    
    // Upload to Supabase Storage
    console.log(`[StorageService] Uploading to bucket: ${BUCKET_NAME}`);
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
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
    
    console.log(`[StorageService] Photo uploaded successfully: ${publicUrl}`);
    
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
  console.log(`Starting batch upload of ${photos.length} photos`);
  
  const uploadPromises = photos.map(photo =>
    uploadPhoto(photo.base64Image, photo.userId, photo.taskId, photo.metadata)
  );
  
  try {
    const results = await Promise.all(uploadPromises);
    const successCount = results.filter(r => r !== null).length;
    console.log(`Batch upload complete: ${successCount}/${photos.length} successful`);
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
    console.log(`Deleting photo: ${filePath}`);
    
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);
    
    if (error) {
      console.error('Error deleting photo:', error);
      return false;
    }
    
    console.log('Photo deleted successfully');
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
      console.log(`Bucket '${BUCKET_NAME}' already exists`);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to create bucket:', error);
    return false;
  }
}