/**
 * Supabase Image Transformation Utilities
 * Version: 1.0
 *
 * Provides utilities for generating transformed image URLs using Supabase Storage's
 * built-in image transformation features. Supports thumbnail generation, quality
 * optimization, and progressive loading strategies.
 *
 * Created: 2025-01-24
 */

interface ImageTransformOptions {
  width?: number
  height?: number
  quality?: number // 20-100
  resize?: 'cover' | 'contain' | 'fill'
  format?: 'origin' | 'webp' | 'auto'
}

interface ProgressiveImageUrls {
  thumbnail: string   // Small, low quality for initial load
  preview: string    // Medium quality for viewport entry
  full: string       // Original image
}

/**
 * Generates a thumbnail URL from a Supabase Storage public URL
 * @param publicUrl - The original public URL from Supabase Storage
 * @param size - Thumbnail size in pixels (square)
 * @param quality - Image quality (20-100, default: 50)
 * @returns Transformed thumbnail URL
 */
export function getThumbnailUrl(
  publicUrl: string,
  size: number = 150,
  quality: number = 50
): string {
  // Ensure the URL is from Supabase Storage
  if (!publicUrl || !publicUrl.includes('supabase')) {
    return publicUrl
  }

  // Parse the URL
  const url = new URL(publicUrl)

  // Add transformation parameters
  url.searchParams.set('width', size.toString())
  url.searchParams.set('height', size.toString())
  url.searchParams.set('quality', quality.toString())
  url.searchParams.set('resize', 'cover') // Crop to fill the square

  return url.toString()
}

/**
 * Generates an optimized image URL with custom transformation options
 * @param publicUrl - The original public URL from Supabase Storage
 * @param options - Image transformation options
 * @returns Transformed image URL
 */
export function getOptimizedImageUrl(
  publicUrl: string,
  options: ImageTransformOptions = {}
): string {
  // Ensure the URL is from Supabase Storage
  if (!publicUrl || !publicUrl.includes('supabase')) {
    return publicUrl
  }

  const {
    width,
    height,
    quality = 80,
    resize = 'contain',
    format = 'auto'
  } = options

  // Parse the URL
  const url = new URL(publicUrl)

  // Add transformation parameters
  if (width) {
    url.searchParams.set('width', Math.min(width, 2500).toString())
  }
  if (height) {
    url.searchParams.set('height', Math.min(height, 2500).toString())
  }
  url.searchParams.set('quality', Math.min(Math.max(quality, 20), 100).toString())
  url.searchParams.set('resize', resize)
  if (format !== 'origin') {
    url.searchParams.set('format', format)
  }

  return url.toString()
}

/**
 * Generates a set of URLs for progressive image loading
 * @param publicUrl - The original public URL from Supabase Storage
 * @returns Object containing thumbnail, preview, and full resolution URLs
 */
export function getProgressiveImageUrls(publicUrl: string): ProgressiveImageUrls {
  // For base64 images or non-Supabase URLs, return the same URL for all sizes
  if (!publicUrl || !publicUrl.includes('supabase')) {
    return {
      thumbnail: publicUrl,
      preview: publicUrl,
      full: publicUrl
    }
  }

  return {
    // Tiny thumbnail for instant loading (blur-up effect)
    thumbnail: getOptimizedImageUrl(publicUrl, {
      width: 150,
      height: 150,
      quality: 40,
      resize: 'cover'
    }),

    // Medium quality preview for in-viewport display
    preview: getOptimizedImageUrl(publicUrl, {
      width: 800,
      height: 800,
      quality: 70,
      resize: 'contain'
    }),

    // Full resolution original image
    full: publicUrl
  }
}

/**
 * Checks if a URL is a Supabase Storage URL that supports transformations
 * @param url - URL to check
 * @returns True if the URL supports transformations
 */
export function supportsTransformation(url: string): boolean {
  if (!url) return false

  // Check if it's a Supabase Storage URL
  if (!url.includes('supabase')) return false

  // Check if it's not a base64 image
  if (url.startsWith('data:')) return false

  // Check for supported image extensions
  const supportedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  const hasImageExtension = supportedExtensions.some(ext =>
    url.toLowerCase().includes(ext)
  )

  return hasImageExtension
}

/**
 * Generates a blur placeholder data URL from a thumbnail URL
 * This creates a tiny base64 image for instant display while loading
 * @param thumbnailUrl - URL of the thumbnail image
 * @returns Promise that resolves to a base64 data URL
 */
export async function generateBlurPlaceholder(thumbnailUrl: string): Promise<string> {
  try {
    // Create a tiny 20x20 version for the blur placeholder
    const tinyUrl = getOptimizedImageUrl(thumbnailUrl, {
      width: 20,
      height: 20,
      quality: 30,
      resize: 'cover'
    })

    // Fetch the tiny image
    const response = await fetch(tinyUrl)
    const blob = await response.blob()

    // Convert to base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Failed to generate blur placeholder:', error)
    // Return a transparent 1x1 pixel as fallback
    return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  }
}

/**
 * Preloads an image URL to prime the browser cache
 * @param url - Image URL to preload
 * @returns Promise that resolves when the image is loaded
 */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = reject
    img.src = url
  })
}

/**
 * Preloads multiple image URLs in parallel
 * @param urls - Array of image URLs to preload
 * @returns Promise that resolves when all images are loaded
 */
export async function preloadImages(urls: string[]): Promise<void> {
  await Promise.all(urls.map(url => preloadImage(url).catch(() => {
    // Silently ignore failed preloads
    console.warn(`Failed to preload image: ${url}`)
  })))
}

/**
 * Gets estimated file size based on transformation parameters
 * Useful for estimating bandwidth usage
 * @param options - Image transformation options
 * @returns Estimated file size in KB
 */
export function estimateTransformedSize(options: ImageTransformOptions): number {
  const { width = 1920, height = 1080, quality = 80 } = options

  // Rough estimation formula based on typical JPEG compression
  const pixels = width * height
  const qualityFactor = quality / 100
  const bitsPerPixel = 0.5 * qualityFactor // Rough estimate
  const sizeInBytes = (pixels * bitsPerPixel * 3) / 8 // 3 channels (RGB)

  return Math.round(sizeInBytes / 1024) // Return in KB
}

/**
 * Generates responsive image srcset for different screen densities
 * @param publicUrl - The original public URL from Supabase Storage
 * @param baseWidth - Base width for 1x density
 * @returns srcset string for responsive images
 */
export function generateSrcSet(publicUrl: string, baseWidth: number = 400): string {
  if (!supportsTransformation(publicUrl)) {
    return publicUrl
  }

  const densities = [1, 1.5, 2, 2.5, 3]
  const srcsetParts = densities.map(density => {
    const width = Math.round(baseWidth * density)
    const url = getOptimizedImageUrl(publicUrl, {
      width,
      quality: density === 1 ? 80 : 70, // Slightly lower quality for higher densities
      resize: 'contain'
    })
    return `${url} ${density}x`
  })

  return srcsetParts.join(', ')
}