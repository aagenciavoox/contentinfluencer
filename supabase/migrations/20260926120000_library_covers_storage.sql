-- Public bucket for library item covers (books, manga, anime, etc.).
-- Paths must be scoped as: {auth.uid()}/...

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'library-covers',
  'library-covers',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "library_covers_select_public" ON storage.objects;
CREATE POLICY "library_covers_select_public"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'library-covers');

DROP POLICY IF EXISTS "library_covers_insert_own" ON storage.objects;
CREATE POLICY "library_covers_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'library-covers'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

DROP POLICY IF EXISTS "library_covers_update_own" ON storage.objects;
CREATE POLICY "library_covers_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'library-covers'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'library-covers'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

DROP POLICY IF EXISTS "library_covers_delete_own" ON storage.objects;
CREATE POLICY "library_covers_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'library-covers'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);
