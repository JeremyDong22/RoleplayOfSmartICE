-- Script to create and configure the duty-manager-photos storage bucket in Supabase
-- This script creates the bucket, sets it as public, and applies RLS policies
-- Created by: Assistant
-- Purpose: Manual setup of duty-manager-photos storage bucket

-- Enable the storage extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Insert the bucket into storage.buckets table
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
    'duty-manager-photos',
    'duty-manager-photos', 
    true, -- Set as public bucket
    false, -- Disable AVIF auto-detection
    52428800, -- 50MB file size limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'] -- Allowed image types
)
ON CONFLICT (id) DO UPDATE
SET 
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Enable read access for all users" ON storage.objects;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON storage.objects;
DROP POLICY IF EXISTS "Enable update for users based on id" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete for users based on id" ON storage.objects;

-- Create RLS policies for the bucket
-- Note: These policies apply to ALL buckets, so we need to filter by bucket_id

-- 1. Enable read access for all users (since it's a public bucket)
CREATE POLICY "Enable read access for all users" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'duty-manager-photos');

-- 2. Enable insert for authenticated users only
CREATE POLICY "Enable insert for authenticated users only" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'duty-manager-photos' 
    AND auth.role() = 'authenticated'
);

-- 3. Enable update for authenticated users
CREATE POLICY "Enable update for users based on id" 
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'duty-manager-photos' 
    AND auth.role() = 'authenticated'
)
WITH CHECK (
    bucket_id = 'duty-manager-photos' 
    AND auth.role() = 'authenticated'
);

-- 4. Enable delete for authenticated users
CREATE POLICY "Enable delete for users based on id" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'duty-manager-photos' 
    AND auth.role() = 'authenticated'
);

-- Verify the bucket was created successfully
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at,
    updated_at
FROM storage.buckets 
WHERE id = 'duty-manager-photos';

-- Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%duty-manager-photos%' 
   OR policyname LIKE 'Enable%';

-- Grant necessary permissions to authenticated users
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- Final message
DO $$
BEGIN
    RAISE NOTICE 'duty-manager-photos bucket has been created/updated successfully!';
    RAISE NOTICE 'The bucket is set as PUBLIC, allowing read access to all users.';
    RAISE NOTICE 'Only authenticated users can insert, update, or delete files.';
END $$;