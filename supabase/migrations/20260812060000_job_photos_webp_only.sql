-- The admin upload flow now always produces a cropped, downscaled WebP
-- client-side (see lib/imageCrop.ts) before anything reaches Storage --
-- tightens the bucket to match what's actually ever uploaded, rather than
-- the original placeholder limits sized for an arbitrary raw photo. No
-- existing objects in this bucket as of this migration (confirmed via
-- direct query), so this is a pure narrowing with nothing to migrate.
update storage.buckets
set allowed_mime_types = array['image/webp'],
    file_size_limit = 2097152 -- 2MB
where id = 'job-photos';
