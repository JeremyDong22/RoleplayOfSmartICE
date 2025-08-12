-- Simplified trigger for task record deletion
-- Created: 2025-08-12
-- Purpose: Log photos for deletion and clean up related records

-- Step 1: Create a table to track photos that need deletion
CREATE TABLE IF NOT EXISTS roleplay_orphaned_photos_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    photo_url text NOT NULL,
    task_record_id uuid,
    deleted_at timestamp with time zone DEFAULT now(),
    cleaned_up boolean DEFAULT false
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_orphaned_photos_cleanup 
ON roleplay_orphaned_photos_log(cleaned_up) 
WHERE cleaned_up = false;

-- Step 2: Drop old trigger
DROP TRIGGER IF EXISTS task_record_cascade_delete ON roleplay_task_records;

-- Step 3: Create new simplified function
CREATE OR REPLACE FUNCTION handle_task_record_deletion()
RETURNS TRIGGER AS $$
DECLARE
    photo_url text;
BEGIN
    -- Delete corresponding task summary records
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
    
    -- Log photos for deletion
    IF OLD.photo_urls IS NOT NULL AND array_length(OLD.photo_urls, 1) > 0 THEN
        FOREACH photo_url IN ARRAY OLD.photo_urls
        LOOP
            INSERT INTO roleplay_orphaned_photos_log (photo_url, task_record_id)
            VALUES (photo_url, OLD.id);
        END LOOP;
        
        RAISE NOTICE 'Logged % photos for deletion from task record %', 
                     array_length(OLD.photo_urls, 1), OLD.id;
    END IF;
    
    -- Log audio for deletion if present
    IF OLD.audio_url IS NOT NULL THEN
        INSERT INTO roleplay_orphaned_photos_log (photo_url, task_record_id)
        VALUES (OLD.audio_url, OLD.id);
        
        RAISE NOTICE 'Logged audio for deletion from task record %', OLD.id;
    END IF;
    
    RETURN OLD;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the deletion
        RAISE WARNING 'Error in deletion trigger: %', SQLERRM;
        RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create the trigger
CREATE TRIGGER task_record_deletion_trigger
    BEFORE DELETE ON roleplay_task_records
    FOR EACH ROW
    EXECUTE FUNCTION handle_task_record_deletion();

-- Step 5: Grant permissions
GRANT EXECUTE ON FUNCTION handle_task_record_deletion() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_task_record_deletion() TO service_role;
GRANT SELECT, INSERT ON roleplay_orphaned_photos_log TO authenticated;
GRANT ALL ON roleplay_orphaned_photos_log TO service_role;

-- Step 6: Create a function to process the deletion log
-- This can be called by the Edge Function periodically
CREATE OR REPLACE FUNCTION get_and_mark_photos_for_deletion()
RETURNS TABLE (
    photo_url text,
    task_record_id uuid,
    deleted_at timestamptz
) AS $$
BEGIN
    -- Mark photos as being processed
    UPDATE roleplay_orphaned_photos_log
    SET cleaned_up = true
    WHERE cleaned_up = false
    AND deleted_at < now() - interval '1 minute'; -- Wait 1 minute to ensure record is fully deleted
    
    -- Return the photos that were just marked
    RETURN QUERY
    SELECT 
        l.photo_url,
        l.task_record_id,
        l.deleted_at
    FROM roleplay_orphaned_photos_log l
    WHERE l.cleaned_up = true
    AND l.deleted_at >= now() - interval '5 minutes'
    ORDER BY l.deleted_at DESC;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_and_mark_photos_for_deletion() TO service_role;

-- Optional: Clean up old log entries periodically (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_deletion_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM roleplay_orphaned_photos_log
    WHERE cleaned_up = true
    AND deleted_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION cleanup_old_deletion_logs() TO service_role;