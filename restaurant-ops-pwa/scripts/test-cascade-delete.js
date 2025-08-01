// Test script for cascade delete trigger
// Run with: node scripts/test-cascade-delete.js

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testCascadeDelete() {
  console.log('Testing cascade delete trigger...\n')

  try {
    // Step 1: Get a sample task record
    console.log('1. Getting a sample task record...')
    const { data: taskRecord, error: fetchError } = await supabase
      .from('roleplay_task_records')
      .select('id, task_id, user_id, date, period_id, photo_urls, audio_url')
      .limit(1)
      .single()

    if (fetchError || !taskRecord) {
      console.error('No task records found to test with')
      return
    }

    console.log('Found task record:', {
      id: taskRecord.id,
      task_id: taskRecord.task_id,
      date: taskRecord.date,
      has_photos: taskRecord.photo_urls ? taskRecord.photo_urls.length : 0,
      has_audio: !!taskRecord.audio_url
    })

    // Step 2: Check if there's a corresponding task_summary record
    console.log('\n2. Checking for corresponding task_summary record...')
    const { data: summaryBefore, error: summaryError } = await supabase
      .from('roleplay_task_summary')
      .select('*')
      .eq('id', taskRecord.id)
      .single()

    if (summaryBefore) {
      console.log('Found matching task_summary record')
    } else {
      console.log('No matching task_summary record found (checking by other criteria)...')
      
      // Try to find by other criteria
      const { data: summaryByOther } = await supabase
        .from('roleplay_task_summary')
        .select('*')
        .eq('date', taskRecord.date)
        .eq('period_id', taskRecord.period_id)
        .limit(1)
        .single()
      
      if (summaryByOther) {
        console.log('Found task_summary record by date and period')
      }
    }

    // Step 3: Delete the task record
    console.log('\n3. Deleting task record...')
    const { error: deleteError } = await supabase
      .from('roleplay_task_records')
      .delete()
      .eq('id', taskRecord.id)

    if (deleteError) {
      console.error('Failed to delete task record:', deleteError)
      return
    }

    console.log('Task record deleted successfully')

    // Step 4: Verify task_summary was also deleted
    console.log('\n4. Verifying task_summary deletion...')
    const { data: summaryAfter, error: verifyError } = await supabase
      .from('roleplay_task_summary')
      .select('*')
      .eq('id', taskRecord.id)
      .single()

    if (!summaryAfter) {
      console.log('✅ SUCCESS: task_summary record was automatically deleted by trigger')
    } else {
      console.log('❌ FAILED: task_summary record still exists')
    }

    // Step 5: Note about storage files
    console.log('\n5. Storage file cleanup:')
    console.log('Note: Storage files need to be deleted using the client service.')
    console.log('Use deleteTaskRecordWithStorage() from taskRecordDeletionService.ts')
    
    if (taskRecord.photo_urls && taskRecord.photo_urls.length > 0) {
      console.log(`- ${taskRecord.photo_urls.length} photo files would need cleanup`)
    }
    if (taskRecord.audio_url) {
      console.log('- 1 audio file would need cleanup')
    }

  } catch (error) {
    console.error('Test failed:', error)
  }

  console.log('\nTest completed.')
}

// Run the test
testCascadeDelete()