-- Optional cover photo for a job posting. Stored as a Storage object path
-- (like application_documents.storage_path), not a full URL -- the public
-- URL is derived at read time via getPublicUrl(), same reasoning as every
-- other path-not-URL column in this schema: the bucket/domain shouldn't be
-- baked into stored data.
alter table public.jobs add column photo_path text;

-- Public bucket (unlike application-documents): job photos are meant to be
-- shown on the public job posting page, not gated behind staff auth. Only
-- staff/admin can write; the file-size/mime-type limits mirror the
-- application-documents bucket's approach of enforcing this at the bucket
-- level, not just in application code. Values are a starting point, not a
-- final answer -- revisit once the actual layout (dimensions/crop) this
-- renders into on the public page is settled.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('job-photos', 'job-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy "staff and admin can upload job photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'job-photos'
  and (select auth.jwt() ->> 'user_role') in ('staff', 'admin')
);

create policy "staff and admin can update job photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'job-photos'
  and (select auth.jwt() ->> 'user_role') in ('staff', 'admin')
)
with check (
  bucket_id = 'job-photos'
  and (select auth.jwt() ->> 'user_role') in ('staff', 'admin')
);

create policy "staff and admin can delete job photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'job-photos'
  and (select auth.jwt() ->> 'user_role') in ('staff', 'admin')
);

-- Explicit public-read policy even though the bucket's public flag already
-- serves objects unauthenticated -- matches this project's habit of not
-- relying on an implicit default (see the audit finding about explicitly
-- revoking PUBLIC execute on privileged functions for the same reasoning).
create policy "anyone can view job photos"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'job-photos');
