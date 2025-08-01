// Service to handle task record deletion with storage cleanup
import { supabase } from './supabase'

export interface DeleteTaskRecordResult {
  success: boolean
  deletedFiles: string[]
  errors?: string[]
  message: string
}

/**
 * Delete a task record and its associated storage files
 * The database trigger will handle deleting the corresponding task_summary record
 */
export async function deleteTaskRecordWithStorage(
  taskRecordId: string
): Promise<DeleteTaskRecordResult> {
  try {
    // First, get the task record to find storage URLs
    const { data: taskRecord, error: fetchError } = await supabase
      .from('roleplay_task_records')
      .select('id, photo_urls, audio_url')
      .eq('id', taskRecordId)
      .single()

    if (fetchError || !taskRecord) {
      return {
        success: false,
        deletedFiles: [],
        errors: ['Task record not found'],
        message: 'Task record not found or already deleted'
      }
    }

    const deletedFiles: string[] = []
    const errors: string[] = []

    // Delete photo files from storage
    if (taskRecord.photo_urls && taskRecord.photo_urls.length > 0) {
      for (const photoUrl of taskRecord.photo_urls) {
        // Extract file path from URL
        // URLs format: https://[project].supabase.co/storage/v1/object/public/restaurant-tasks/[path]
        const match = photoUrl.match(/restaurant-tasks\/(.+)$/)
        if (match && match[1]) {
          const filePath = match[1]
          const { error } = await supabase.storage
            .from('restaurant-tasks')
            .remove([filePath])
          
          if (error) {
            errors.push(`Failed to delete photo: ${filePath} - ${error.message}`)
            console.error('Storage deletion error:', error)
          } else {
            deletedFiles.push(filePath)
          }
        }
      }
    }

    // Delete audio file from storage
    if (taskRecord.audio_url) {
      const match = taskRecord.audio_url.match(/restaurant-tasks\/(.+)$/)
      if (match && match[1]) {
        const filePath = match[1]
        const { error } = await supabase.storage
          .from('restaurant-tasks')
          .remove([filePath])
        
        if (error) {
          errors.push(`Failed to delete audio: ${filePath} - ${error.message}`)
          console.error('Storage deletion error:', error)
        } else {
          deletedFiles.push(filePath)
        }
      }
    }

    // Now delete the task record from database
    // The trigger will automatically delete the corresponding task_summary record
    const { error: deleteError } = await supabase
      .from('roleplay_task_records')
      .delete()
      .eq('id', taskRecordId)

    if (deleteError) {
      return {
        success: false,
        deletedFiles,
        errors: [...errors, `Failed to delete task record: ${deleteError.message}`],
        message: 'Failed to delete task record from database'
      }
    }

    return {
      success: true,
      deletedFiles,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully deleted task record and ${deletedFiles.length} storage files`
    }

  } catch (error) {
    console.error('Error in deleteTaskRecordWithStorage:', error)
    return {
      success: false,
      deletedFiles: [],
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      message: 'Failed to delete task record'
    }
  }
}

/**
 * Batch delete multiple task records with their storage files
 */
export async function batchDeleteTaskRecords(
  taskRecordIds: string[]
): Promise<{ results: DeleteTaskRecordResult[]; summary: string }> {
  const results: DeleteTaskRecordResult[] = []
  let totalDeleted = 0
  let totalErrors = 0

  for (const id of taskRecordIds) {
    const result = await deleteTaskRecordWithStorage(id)
    results.push(result)
    
    if (result.success) {
      totalDeleted++
    } else {
      totalErrors++
    }
  }

  const summary = `Deleted ${totalDeleted} records successfully. ${totalErrors} errors occurred.`

  return { results, summary }
}

/**
 * Delete all task records for a specific date
 */
export async function deleteTaskRecordsByDate(
  date: string,
  userId?: string
): Promise<{ deletedCount: number; errors: string[] }> {
  try {
    // Build query
    let query = supabase
      .from('roleplay_task_records')
      .select('id')
      .eq('date', date)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    // Get all records for the date
    const { data: records, error: fetchError } = await query

    if (fetchError) {
      return {
        deletedCount: 0,
        errors: [`Failed to fetch records: ${fetchError.message}`]
      }
    }

    if (!records || records.length === 0) {
      return {
        deletedCount: 0,
        errors: []
      }
    }

    // Delete each record with storage cleanup
    const recordIds = records.map(r => r.id)
    const { results } = await batchDeleteTaskRecords(recordIds)

    const deletedCount = results.filter(r => r.success).length
    const allErrors = results
      .filter(r => !r.success)
      .flatMap(r => r.errors || [])

    return {
      deletedCount,
      errors: allErrors
    }

  } catch (error) {
    console.error('Error in deleteTaskRecordsByDate:', error)
    return {
      deletedCount: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }
  }
}