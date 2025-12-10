-- Migration: Setup RLS Policies for journal-screenshots storage bucket

-- Enable RLS on the storage.objects table (this controls access to all buckets)
-- Note: storage.objects is the system table that tracks all uploaded files

-- Policy: Allow users to upload to their own folder in journal-screenshots bucket
CREATE POLICY "Users can upload to journal-screenshots bucket"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'journal-screenshots' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Allow users to view their own screenshots in journal-screenshots bucket
CREATE POLICY "Users can view own screenshots in journal-screenshots"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'journal-screenshots' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Allow users to delete their own screenshots in journal-screenshots bucket
CREATE POLICY "Users can delete own screenshots in journal-screenshots"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'journal-screenshots' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Allow update (to change metadata)
CREATE POLICY "Users can update own screenshots in journal-screenshots"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'journal-screenshots' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'journal-screenshots' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
