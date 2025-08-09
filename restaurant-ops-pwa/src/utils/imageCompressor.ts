/**
 * Image Compression Utilities
 * 
 * Provides image compression and optimization for upload
 * Reduces file size while maintaining acceptable quality
 * Handles EXIF orientation and memory optimization
 * 
 * Created: 2025-08-05
 */

interface CompressionOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'jpeg' | 'webp'
  preserveAspectRatio?: boolean
}

interface ImageDimensions {
  width: number
  height: number
  aspectRatio: number
}

/**
 * Default compression settings optimized for mobile upload
 */
const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8,
  format: 'jpeg',
  preserveAspectRatio: true
}

/**
 * Compresses a base64 image string
 */
export async function compressImage(
  base64String: string,
  options: CompressionOptions = {}
): Promise<string> {
  const settings = { ...DEFAULT_OPTIONS, ...options }
  
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => {
      try {
        // Calculate target dimensions
        const dimensions = calculateTargetDimensions(
          { width: img.width, height: img.height },
          settings
        )
        
        // Create canvas for compression
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }
        
        // Set canvas dimensions
        canvas.width = dimensions.width
        canvas.height = dimensions.height
        
        // Apply smoothing for better quality
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        
        // Draw and compress image
        ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height)
        
        // Convert to base64 with specified quality
        const mimeType = settings.format === 'webp' ? 'image/webp' : 'image/jpeg'
        const compressedBase64 = canvas.toDataURL(mimeType, settings.quality)
        
        // Clean up
        canvas.width = 0
        canvas.height = 0
        
        // Log compression results
        const originalSize = base64String.length
        const compressedSize = compressedBase64.length
        const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1)
        
        console.log(`Image compressed: ${reduction}% size reduction`)
        console.log(`Original: ${(originalSize / 1024).toFixed(1)}KB → Compressed: ${(compressedSize / 1024).toFixed(1)}KB`)
        
        resolve(compressedBase64)
      } catch (error) {
        reject(error)
      }
    }
    
    img.onerror = () => {
      reject(new Error('Failed to load image for compression'))
    }
    
    img.src = base64String
  })
}

/**
 * Compresses multiple images in batch
 */
export async function compressImageBatch(
  images: string[],
  options: CompressionOptions = {}
): Promise<string[]> {
  const compressionPromises = images.map(image => 
    compressImage(image, options).catch(error => {
      console.error('Failed to compress image:', error)
      return image // Return original if compression fails
    })
  )
  
  return Promise.all(compressionPromises)
}

/**
 * Calculates target dimensions based on constraints
 */
function calculateTargetDimensions(
  original: { width: number; height: number },
  options: CompressionOptions
): ImageDimensions {
  const { maxWidth = 1920, maxHeight = 1080, preserveAspectRatio = true } = options
  
  if (!preserveAspectRatio) {
    return {
      width: Math.min(original.width, maxWidth),
      height: Math.min(original.height, maxHeight),
      aspectRatio: maxWidth / maxHeight
    }
  }
  
  const aspectRatio = original.width / original.height
  
  let targetWidth = original.width
  let targetHeight = original.height
  
  // Scale down if necessary
  if (targetWidth > maxWidth) {
    targetWidth = maxWidth
    targetHeight = targetWidth / aspectRatio
  }
  
  if (targetHeight > maxHeight) {
    targetHeight = maxHeight
    targetWidth = targetHeight * aspectRatio
  }
  
  return {
    width: Math.round(targetWidth),
    height: Math.round(targetHeight),
    aspectRatio
  }
}

/**
 * Estimates the file size of a base64 string in bytes
 */
export function estimateFileSize(base64String: string): number {
  // Remove data URI prefix if present
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '')
  
  // Base64 encoding increases size by ~33%
  // Each character in base64 represents 6 bits
  const paddingLength = (base64Data.match(/=/g) || []).length
  const fileSize = (base64Data.length * 0.75) - paddingLength
  
  return Math.round(fileSize)
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
}

/**
 * Checks if an image needs compression based on size
 */
export function needsCompression(base64String: string, maxSizeKB: number = 500): boolean {
  const sizeInBytes = estimateFileSize(base64String)
  const sizeInKB = sizeInBytes / 1024
  
  return sizeInKB > maxSizeKB
}

/**
 * Progressively compresses an image until it meets size requirements
 */
export async function compressToSize(
  base64String: string,
  maxSizeKB: number = 500,
  minQuality: number = 0.3
): Promise<string> {
  let quality = 0.9
  let compressed = base64String
  let attempts = 0
  const maxAttempts = 5
  
  while (attempts < maxAttempts) {
    compressed = await compressImage(base64String, { quality })
    const sizeKB = estimateFileSize(compressed) / 1024
    
    console.log(`Compression attempt ${attempts + 1}: quality=${quality}, size=${sizeKB.toFixed(1)}KB`)
    
    if (sizeKB <= maxSizeKB || quality <= minQuality) {
      break
    }
    
    // Reduce quality for next attempt
    quality = Math.max(quality - 0.15, minQuality)
    attempts++
  }
  
  return compressed
}

/**
 * Fixes image orientation based on EXIF data (simplified version)
 * Note: Full EXIF handling would require additional library
 */
export async function fixImageOrientation(base64String: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        resolve(base64String)
        return
      }
      
      // For now, just return the image as-is
      // Full EXIF rotation would require parsing EXIF data
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      
      const result = canvas.toDataURL('image/jpeg', 0.9)
      
      // Clean up
      canvas.width = 0
      canvas.height = 0
      
      resolve(result)
    }
    
    img.onerror = () => {
      resolve(base64String)
    }
    
    img.src = base64String
  })
}

/**
 * Creates a thumbnail from a base64 image
 */
export async function createThumbnail(
  base64String: string,
  size: number = 150
): Promise<string> {
  return compressImage(base64String, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.7,
    preserveAspectRatio: true
  })
}

/**
 * Validates if a string is a valid base64 image
 */
export function isValidBase64Image(str: string): boolean {
  if (!str) return false
  
  // Check for data URI prefix
  const hasDataUri = str.startsWith('data:image/')
  
  if (hasDataUri) {
    // Validate data URI format
    const regex = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/
    return regex.test(str)
  }
  
  // Check if it's valid base64
  try {
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
    return base64Regex.test(str)
  } catch {
    return false
  }
}

/**
 * Gets image dimensions from base64 string
 */
export function getImageDimensions(base64String: string): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
        aspectRatio: img.width / img.height
      })
    }
    
    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }
    
    img.src = base64String
  })
}