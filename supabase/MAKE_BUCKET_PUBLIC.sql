-- ============================================================================
-- FIX: Make journal-screenshots Bucket Public
-- ============================================================================
-- If your bucket is showing public: false, run this SQL to make it public

-- Update the bucket to be public
UPDATE storage.buckets
SET public = true
WHERE id = 'journal-screenshots';

-- Verify it worked:
SELECT id, name, public
FROM storage.buckets
WHERE id = 'journal-screenshots';

-- You should see: public = true
