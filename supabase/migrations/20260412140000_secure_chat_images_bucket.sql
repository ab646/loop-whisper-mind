-- SEC-18: Make chat-images bucket private so uploaded screenshots
-- are only accessible to the authenticated user who owns them.

-- 1. Set bucket to private
UPDATE storage.buckets SET public = false WHERE id = 'chat-images';

-- 2. Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Public read access for chat images" ON storage.objects;

-- 3. Replace with an authenticated, owner-scoped SELECT policy
CREATE POLICY "Users can view own chat images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
