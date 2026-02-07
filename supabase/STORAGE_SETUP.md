# Storage Bucket Setup

The app syncs menu images to Supabase Storage. Create the bucket and policies manually:

## 1. Create the bucket

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. Click **Storage** in the sidebar
3. Click **New bucket**
4. Name: `menu-images`
5. Uncheck "Public bucket" (keep it private)
6. Click **Create bucket**

## 2. Add storage policies (fixes RLS upload errors)

In **SQL Editor** → New query, paste and run:

```sql
-- Allow uploads to menu-images bucket
CREATE POLICY "Allow uploads to menu-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'menu-images');

-- Allow reads from menu-images bucket
CREATE POLICY "Allow reads from menu-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'menu-images');

-- Allow updates (for upsert/overwrite)
CREATE POLICY "Allow updates to menu-images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'menu-images')
WITH CHECK (bucket_id = 'menu-images');

-- Allow deletes
CREATE POLICY "Allow deletes from menu-images"
ON storage.objects FOR DELETE
USING (bucket_id = 'menu-images');
```

Then sync will work.
