-- Temporary script to allow anonymous uploads to duty-manager-photos bucket
-- WARNING: This reduces security - use only for testing
-- Created: 2025-01-23

-- Drop existing insert policy
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON storage.objects;

-- Create a more permissive insert policy that allows anonymous uploads
CREATE POLICY "Enable insert for all users (temporary)" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'duty-manager-photos'
    -- No auth check - allows anonymous uploads
);

-- Also ensure the bucket is truly public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'duty-manager-photos';

-- Verify the changes
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%insert%';

DO $$
BEGIN
    RAISE WARNING 'Anonymous uploads are now allowed for duty-manager-photos bucket.';
    RAISE WARNING 'This is a TEMPORARY solution for testing only!';
    RAISE WARNING 'Remember to restore proper authentication before production.';
END $$;