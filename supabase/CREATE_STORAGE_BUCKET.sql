-- ============================================================================
-- CREATE STORAGE BUCKET FOR JOURNAL SCREENSHOTS
-- ============================================================================
-- Run this SQL in Supabase SQL Editor to create the journal-screenshots bucket
-- with proper RLS policies

-- Step 1: Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('journal-screenshots', 'journal-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Enable RLS on storage.objects table (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies for the bucket

-- Policy 1: Allow authenticated users to INSERT their own files
DROP POLICY IF EXISTS "Allow insert to journal-screenshots" ON storage.objects;
CREATE POLICY "Allow insert to journal-screenshots"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'journal-screenshots'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Allow authenticated users to SELECT their own files
DROP POLICY IF EXISTS "Allow select from journal-screenshots" ON storage.objects;
CREATE POLICY "Allow select from journal-screenshots"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'journal-screenshots'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Allow authenticated users to DELETE their own files
DROP POLICY IF EXISTS "Allow delete from journal-screenshots" ON storage.objects;
CREATE POLICY "Allow delete from journal-screenshots"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'journal-screenshots'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Allow authenticated users to UPDATE their own files
DROP POLICY IF EXISTS "Allow update journal-screenshots" ON storage.objects;
CREATE POLICY "Allow update journal-screenshots"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'journal-screenshots'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'journal-screenshots'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- VERIFY THE BUCKET WAS CREATED
-- ============================================================================
-- Run this query to check:
/*
SELECT id, name, public
FROM storage.buckets
WHERE id = 'journal-screenshots';

-- Should return one row with:
-- id: journal-screenshots
-- name: journal-screenshots  
-- public: true
*/

-- ============================================================================
-- VERIFY RLS POLICIES
-- ============================================================================
-- Run this to see all policies for storage.objects:
/*
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'objects'
ORDER BY policyname;
*/

-- You should see 4 policies for journal-screenshots
