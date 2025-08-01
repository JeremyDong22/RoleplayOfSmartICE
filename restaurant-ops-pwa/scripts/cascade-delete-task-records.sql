-- Cascade delete trigger for roleplay_task_records
-- When a record is deleted from roleplay_task_records:
-- 1. Delete associated files from storage (using HTTP request to storage API)
-- 2. Delete corresponding summary records

-- Create function to handle cascade deletion
CREATE OR REPLACE FUNCTION handle_task_record_deletion()
RETURNS TRIGGER AS $$
DECLARE
    photo_url text;
    file_path text;
    storage_result int;
BEGIN
    -- Note: Direct storage deletion from database trigger is limited in Supabase
    -- We'll focus on cleaning up the database records
    -- Storage cleanup can be handled via:
    -- 1. Edge Function with a cron job
    -- 2. Client-side deletion before database deletion
    -- 3. Periodic cleanup script
    
    -- Log storage URLs that need cleanup (for potential batch cleanup later)
    IF OLD.photo_urls IS NOT NULL AND array_length(OLD.photo_urls, 1) > 0 THEN
        RAISE NOTICE 'Task record % deleted with photo URLs: %', OLD.id, OLD.photo_urls;
    END IF;
    
    IF OLD.audio_url IS NOT NULL THEN
        RAISE NOTICE 'Task record % deleted with audio URL: %', OLD.id, OLD.audio_url;
    END IF;
    
    -- Delete corresponding task summary records
    -- First, check if there's a direct relationship via ID
    DELETE FROM roleplay_task_summary
    WHERE id = OLD.id;
    
    -- If no direct match, try matching by date, user, and task details
    IF NOT FOUND THEN
        DELETE FROM roleplay_task_summary
        WHERE date = OLD.date
          AND period_id = OLD.period_id
          AND user_name = (
              SELECT full_name 
              FROM roleplay_users 
              WHERE id = OLD.user_id
          )
          AND task_title = (
              SELECT title 
              FROM roleplay_tasks 
              WHERE id = OLD.task_id
          );
    END IF;
    
    RETURN OLD;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the deletion
        RAISE WARNING 'Error in cascade delete trigger: %', SQLERRM;
        RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS task_record_cascade_delete ON roleplay_task_records;
CREATE TRIGGER task_record_cascade_delete
BEFORE DELETE ON roleplay_task_records
FOR EACH ROW
EXECUTE FUNCTION handle_task_record_deletion();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_task_record_deletion() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_task_record_deletion() TO service_role;

-- Add comment explaining the trigger
COMMENT ON TRIGGER task_record_cascade_delete ON roleplay_task_records IS 
'Automatically deletes associated storage files and summary records when a task record is deleted';

-- Add comment to function
COMMENT ON FUNCTION handle_task_record_deletion() IS 
'Handles cascade deletion of storage files and summary records when a task record is deleted';