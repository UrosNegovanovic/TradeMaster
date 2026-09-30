-- Uploads go through the Clerk-authenticated Next.js API with the service role.
-- Keep public SELECT so shared catalogs can still display product images and logos.
BEGIN;

DROP POLICY IF EXISTS "Full Access for Authenticated Users 16wiy3a_0" ON storage.objects;
DROP POLICY IF EXISTS "Full Access for Authenticated Users 16wiy3a_1" ON storage.objects;
DROP POLICY IF EXISTS "Full Access for Authenticated Users 16wiy3a_2" ON storage.objects;
DROP POLICY IF EXISTS "Full Access for Authenticated Users 16wiy3a_3" ON storage.objects;
DROP POLICY IF EXISTS "Logo Access 18irv1f_0" ON storage.objects;
DROP POLICY IF EXISTS "Logo Access 18irv1f_1" ON storage.objects;
DROP POLICY IF EXISTS "Logo Access 18irv1f_2" ON storage.objects;
DROP POLICY IF EXISTS "Logo Access 18irv1f_3" ON storage.objects;

DROP POLICY IF EXISTS "Public read product-images" ON storage.objects;
DROP POLICY IF EXISTS "Public read merchant-logos" ON storage.objects;

CREATE POLICY "Public read product-images"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "Public read merchant-logos"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'merchant-logos');

UPDATE storage.buckets
SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/avif',
    'image/bmp'
  ]
WHERE id IN ('product-images', 'merchant-logos');

COMMIT;
