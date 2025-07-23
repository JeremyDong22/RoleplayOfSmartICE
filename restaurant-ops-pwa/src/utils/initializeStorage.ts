// Initialize Supabase Storage bucket for duty manager photos
import { createBucketIfNotExists } from '../services/storageService'

export async function initializeStorage() {
  try {
    console.log('Checking Supabase Storage bucket...')
    // Skip bucket creation for now - it should be created via SQL
    // Just log a message
    console.log('Note: Ensure duty-manager-photos bucket exists in Supabase Storage')
    console.log('Run the SQL script in scripts/create-duty-manager-photos-bucket.sql if needed')
  } catch (error) {
    console.error('Storage check error:', error)
  }
}