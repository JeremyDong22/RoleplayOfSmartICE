// Sample Manager Constants
// Centralized configuration for sample management features

// File upload constraints
export const FILE_UPLOAD_CONSTANTS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB max file size
  COMPRESSED_TARGET_SIZE: 2 * 1024 * 1024, // 2MB compression target
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  MAX_FILES_PER_UPLOAD: 10,
  IMAGE_QUALITY: 0.9
}

// Cache configuration
export const CACHE_CONFIG = {
  DURATION: 5 * 60 * 1000, // 5 minutes cache duration
  RESTAURANT_KEY: 'restaurants',
  ROLES_KEY: 'roles'
}

// Database query configuration
export const QUERY_CONFIG = {
  TIMEOUT: 10000, // 10 second timeout for database queries
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000 // 1 second between retries
}

// Camera configuration
export const CAMERA_CONFIG = {
  ZOOM_MIN: 1,
  ZOOM_MAX: 3,
  ZOOM_STEP: 0.1,
  CLEANUP_DELAY: 100 // Delay before cleaning up camera resources
}

// UI configuration
export const UI_CONFIG = {
  SNACKBAR_DURATION: 3000, // 3 seconds for snackbar messages
  DEBOUNCE_DELAY: 300, // 300ms debounce for input fields
  IMAGE_PREVIEW_SIZE: 150 // Image preview dimensions in pixels
}