-- Storage policies for menu-images bucket
-- Run this in Supabase SQL Editor if uploads fail with RLS errors
-- (Dashboard → SQL Editor → New query → paste and run)

-- Allow INSERT (upload) into menu-images bucket
CREATE POLICY "Allow uploads to menu-images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'menu-images');

-- Allow SELECT (download) from menu-images bucket
CREATE POLICY "Allow reads from menu-images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'menu-images');

-- Allow UPDATE (for upsert/overwrite)
CREATE POLICY "Allow updates to menu-images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'menu-images')
WITH CHECK (bucket_id = 'menu-images');

-- Allow DELETE (for cleanup if needed)
CREATE POLICY "Allow deletes from menu-images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'menu-images');
