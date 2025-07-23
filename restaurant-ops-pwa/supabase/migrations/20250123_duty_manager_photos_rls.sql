-- Migration: Set up RLS policies for duty-manager-photos storage bucket
-- Created: 2025-01-23
-- Description: Configure Row Level Security policies for the duty-manager-photos storage bucket
--              to allow authenticated users to upload, everyone to view, and users to delete their own photos

-- Enable RLS on storage.objects table (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for duty-manager-photos bucket if they exist
DROP POLICY IF EXISTS "duty_manager_photos_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "duty_manager_photos_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "duty_manager_photos_delete_policy" ON storage.objects;

-- Policy 1: Allow any authenticated user to upload photos (INSERT)
CREATE POLICY "duty_manager_photos_insert_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'duty-manager-photos'
);

-- Policy 2: Allow anyone (including anonymous users) to view photos (SELECT)
-- This is necessary for public URL access
CREATE POLICY "duty_manager_photos_select_policy"
ON storage.objects
FOR SELECT
TO public
USING (
    bucket_id = 'duty-manager-photos'
);

-- Policy 3: Allow users to delete their own photos (DELETE)
-- Uses the owner column to match the authenticated user's ID
CREATE POLICY "duty_manager_photos_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'duty-manager-photos' 
    AND auth.uid() = owner
);

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'duty-manager-photos',
    'duty-manager-photos',
    true, -- Public bucket for URL access
    10485760, -- 10MB file size limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET 
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;

-- Add comment for documentation
COMMENT ON POLICY "duty_manager_photos_insert_policy" ON storage.objects IS 
'Allows authenticated users to upload photos to the duty-manager-photos bucket';

COMMENT ON POLICY "duty_manager_photos_select_policy" ON storage.objects IS 
'Allows anyone to view photos in the duty-manager-photos bucket for public URL access';

COMMENT ON POLICY "duty_manager_photos_delete_policy" ON storage.objects IS 
'Allows users to delete only their own photos from the duty-manager-photos bucket';