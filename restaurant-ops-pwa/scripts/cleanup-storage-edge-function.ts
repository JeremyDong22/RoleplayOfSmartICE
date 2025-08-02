// Edge Function to clean up storage files when task records are deleted
// This function should be called after deleting a task record

import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Interface removed - not needed as we're using inline type

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key for storage operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const { taskRecordId } = await req.json()

    if (!taskRecordId) {
      return new Response(
        JSON.stringify({ error: 'taskRecordId is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get the task record to find storage URLs
    const { data: taskRecord, error: fetchError } = await supabase
      .from('roleplay_task_records')
      .select('id, photo_urls, audio_url')
      .eq('id', taskRecordId)
      .single()

    if (fetchError || !taskRecord) {
      console.log('Task record not found or already deleted')
      return new Response(
        JSON.stringify({ message: 'Task record not found or already deleted' }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const deletedFiles: string[] = []
    const errors: string[] = []

    // Delete photo files
    if (taskRecord.photo_urls && taskRecord.photo_urls.length > 0) {
      for (const photoUrl of taskRecord.photo_urls) {
        // Extract file path from URL
        const match = photoUrl.match(/restaurant-tasks\/(.+)$/)
        if (match && match[1]) {
          const filePath = match[1]
          const { error } = await supabase.storage
            .from('restaurant-tasks')
            .remove([filePath])
          
          if (error) {
            errors.push(`Failed to delete photo: ${filePath} - ${error.message}`)
          } else {
            deletedFiles.push(filePath)
          }
        }
      }
    }

    // Delete audio file
    if (taskRecord.audio_url) {
      const match = taskRecord.audio_url.match(/restaurant-tasks\/(.+)$/)
      if (match && match[1]) {
        const filePath = match[1]
        const { error } = await supabase.storage
          .from('restaurant-tasks')
          .remove([filePath])
        
        if (error) {
          errors.push(`Failed to delete audio: ${filePath} - ${error.message}`)
        } else {
          deletedFiles.push(filePath)
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        deletedFiles,
        errors: errors.length > 0 ? errors : undefined,
        message: `Cleaned up ${deletedFiles.length} files`
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in cleanup-storage function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})