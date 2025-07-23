// Initialize Supabase Storage bucket for duty manager photos
import { createBucketIfNotExists } from '../services/storageService'

export async function initializeStorage() {
  try {
    console.log('Initializing Supabase Storage bucket...')
    const result = await createBucketIfNotExists()
    if (result) {
      console.log('Storage bucket initialized successfully')
    } else {
      console.log('Storage bucket already exists or initialization failed')
    }
  } catch (error) {
    console.error('Failed to initialize storage:', error)
  }
}