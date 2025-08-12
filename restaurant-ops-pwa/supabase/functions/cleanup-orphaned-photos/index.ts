// Edge Function to cleanup orphaned photos in Storage
// Created: 2025-08-12
// Updated: 2025-08-12 - Enhanced to handle both scheduled cleanup and on-demand deletion
// Purpose: 
// 1. Automatically remove photos from Storage that are no longer referenced in database
// 2. Delete specific photos when a task_record is deleted

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })

    // Parse request body
    const body = await req.json().catch(() => ({}))
    
    // Check if this is a specific deletion request (from trigger)
    if (body.action === 'delete_specific' && body.photo_urls) {
      console.log('Processing specific photo deletion request...')
      
      const urlsToDelete = Array.isArray(body.photo_urls) ? body.photo_urls : [body.photo_urls]
      let deletedCount = 0
      const deleteErrors: string[] = []
      
      for (const url of urlsToDelete) {
        // Extract the path from the full URL
        // URL format: https://xxx.supabase.co/storage/v1/object/public/RolePlay/photos/2025-08-12/xxx.jpg
        const match = url.match(/\/RolePlay\/(.+)$/)
        if (match && match[1]) {
          const filePath = match[1]
          console.log(`Deleting: ${filePath}`)
          
          const { error: deleteError } = await supabase
            .storage
            .from('RolePlay')
            .remove([filePath])
          
          if (deleteError) {
            console.error(`Failed to delete ${filePath}: ${deleteError.message}`)
            deleteErrors.push(`${filePath}: ${deleteError.message}`)
          } else {
            console.log(`Successfully deleted: ${filePath}`)
            deletedCount++
          }
        }
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          message: `Deleted ${deletedCount} of ${urlsToDelete.length} photos`,
          deletedCount,
          errors: deleteErrors.length > 0 ? deleteErrors : undefined,
          timestamp: new Date().toISOString(),
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
          status: 200
        }
      )
    }

    // Default behavior: Clean up all orphaned photos
    console.log('Starting orphaned photos cleanup...')

    // Step 1: Get all photos from Storage (need to check each date folder)
    const allStorageFiles: any[] = []
    
    // First, get list of date folders
    const { data: dateFolders, error: folderError } = await supabase
      .storage
      .from('RolePlay')
      .list('photos', {
        limit: 100,
        offset: 0,
      })

    if (folderError) {
      throw new Error(`Failed to list folders: ${folderError.message}`)
    }

    // Then get files from each date folder
    if (dateFolders && dateFolders.length > 0) {
      for (const folder of dateFolders) {
        // Check if it's a date folder (format: YYYY-MM-DD)
        if (/^\d{4}-\d{2}-\d{2}$/.test(folder.name)) {
          const { data: files, error: filesError } = await supabase
            .storage
            .from('RolePlay')
            .list(`photos/${folder.name}`, {
              limit: 1000,
              offset: 0,
            })
          
          if (!filesError && files) {
            // Add folder path to each file
            files.forEach(file => {
              if (file.name && !file.name.includes('.emptyFolderPlaceholder')) {
                allStorageFiles.push({
                  ...file,
                  fullPath: `photos/${folder.name}/${file.name}`
                })
              }
            })
          }
        }
      }
    }

    console.log(`Found ${allStorageFiles.length} files in storage`)

    if (allStorageFiles.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No files to clean',
          deletedCount: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 2: Get all photo URLs from database
    const { data: taskRecords, error: dbError } = await supabase
      .from('roleplay_task_records')
      .select('photo_urls')
      .not('photo_urls', 'is', null)

    if (dbError) {
      throw new Error(`Failed to fetch task records: ${dbError.message}`)
    }

    // Extract all referenced photo paths
    const referencedPhotos = new Set<string>()
    
    if (taskRecords) {
      for (const record of taskRecords) {
        if (record.photo_urls && Array.isArray(record.photo_urls)) {
          for (const url of record.photo_urls) {
            // Extract the path from the full URL
            const match = url.match(/\/photos\/(.+)$/)
            if (match && match[1]) {
              referencedPhotos.add(`photos/${match[1]}`)
            }
          }
        }
      }
    }

    console.log(`Found ${referencedPhotos.size} referenced photos in database`)

    // Step 3: Find orphaned photos (in storage but not in database)
    const orphanedPhotos: string[] = []
    
    for (const file of allStorageFiles) {
      if (!referencedPhotos.has(file.fullPath)) {
        orphanedPhotos.push(file.fullPath)
      }
    }

    console.log(`Found ${orphanedPhotos.length} orphaned photos to delete`)

    // Step 4: Delete orphaned photos from Storage
    let deletedCount = 0
    const deleteErrors: string[] = []

    for (const photoPath of orphanedPhotos) {
      const { error: deleteError } = await supabase
        .storage
        .from('RolePlay')
        .remove([photoPath])

      if (deleteError) {
        console.error(`Failed to delete ${photoPath}: ${deleteError.message}`)
        deleteErrors.push(`${photoPath}: ${deleteError.message}`)
      } else {
        console.log(`Deleted: ${photoPath}`)
        deletedCount++
      }
    }

    // Step 5: Optional - Clean up empty date folders
    if (dateFolders) {
      for (const folder of dateFolders) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(folder.name)) {
          const { data: remainingFiles } = await supabase
            .storage
            .from('RolePlay')
            .list(`photos/${folder.name}`, {
              limit: 1,
              offset: 0,
            })
          
          // If folder is empty or only has placeholder, it could be deleted
          // But Supabase doesn't support folder deletion directly
          if (!remainingFiles || remainingFiles.length === 0) {
            console.log(`Empty folder detected: photos/${folder.name}`)
          }
        }
      }
    }

    // Return summary
    const response = {
      success: true,
      message: `Cleanup completed`,
      stats: {
        totalFilesInStorage: allStorageFiles.length,
        referencedInDatabase: referencedPhotos.size,
        orphanedPhotos: orphanedPhotos.length,
        deletedCount: deletedCount,
        deleteErrors: deleteErrors.length,
      },
      errors: deleteErrors.length > 0 ? deleteErrors : undefined,
      timestamp: new Date().toISOString(),
    }

    console.log('Cleanup completed:', response)

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in cleanup function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred',
        timestamp: new Date().toISOString(),
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 500
      }
    )
  }
})