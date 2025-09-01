-- Fix Storage Permissions for duty-manager-photos bucket
-- This script properly configures RLS policies for anonymous uploads
-- Created: 2025-01-23

-- First, ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'duty-manager-photos',
    'duty-manager-photos', 
    true, -- Public bucket for read access
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET 
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Drop all existing policies for this bucket to start fresh
DO $$
BEGIN
    -- Drop policies if they exist
    DROP POLICY IF EXISTS "duty_manager_photos_read" ON storage.objects;
    DROP POLICY IF EXISTS "duty_manager_photos_insert" ON storage.objects;
    DROP POLICY IF EXISTS "duty_manager_photos_update" ON storage.objects;
    DROP POLICY IF EXISTS "duty_manager_photos_delete" ON storage.objects;
    DROP POLICY IF EXISTS "Enable read access for all users" ON storage.objects;
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON storage.objects;
    DROP POLICY IF EXISTS "Enable insert for all users (temporary)" ON storage.objects;
    DROP POLICY IF EXISTS "Enable update for users based on id" ON storage.objects;
    DROP POLICY IF EXISTS "Enable delete for users based on id" ON storage.objects;
EXCEPTION
    WHEN undefined_object THEN
        -- Policy doesn't exist, continue
        NULL;
END $$;

-- Create new policies with unique names

-- 1. Allow everyone to read (since bucket is public)
CREATE POLICY "duty_manager_photos_read" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'duty-manager-photos');

-- 2. Allow anyone (including anonymous) to insert
-- This is necessary for testing without authentication
CREATE POLICY "duty_manager_photos_insert" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'duty-manager-photos');

-- 3. Allow anyone to update their own uploads (optional, for testing)
CREATE POLICY "duty_manager_photos_update" 
ON storage.objects FOR UPDATE
USING (bucket_id = 'duty-manager-photos')
WITH CHECK (bucket_id = 'duty-manager-photos');

-- 4. Allow anyone to delete (optional, for testing)
CREATE POLICY "duty_manager_photos_delete" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'duty-manager-photos');

-- Verify the bucket configuration
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'duty-manager-photos';

-- Verify the policies
SELECT 
    policyname,
    cmd,
    permissive,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE 'duty_manager_photos%';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✓ duty-manager-photos bucket configured successfully!';
    RAISE NOTICE '✓ Anonymous uploads are now allowed';
    RAISE NOTICE '✓ Public read access is enabled';
    RAISE NOTICE '';
    RAISE NOTICE 'WARNING: This configuration is for TESTING ONLY!';
    RAISE NOTICE 'For production, restrict insert policy to authenticated users.';
END $$;