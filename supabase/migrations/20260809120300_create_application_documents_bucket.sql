-- Private bucket for resume/transcript uploads. Storage RLS can't scope
-- anon INSERT to "only into rows the uploader owns" the way table RLS does
-- via a foreign-key check -- Storage policies only see the object path, not
-- relational context, and anon has no identity to prove which application
-- is "theirs". The realistic mitigation is Turnstile (verified server-side
-- before any write happens) plus this broad bucket-scoped policy, not
-- per-application isolation. Weaker than the table-level RLS elsewhere in
-- this schema -- known, not an oversight.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('application-documents', 'application-documents', false, 5242880, array['application/pdf']);

create policy "anon can upload application documents"
on storage.objects for insert
to anon
with check (bucket_id = 'application-documents');

-- No anon select: uploaded files are never publicly readable or listable.

create policy "staff and admin can read application documents"
on storage.objects for select
to authenticated
using (
  bucket_id = 'application-documents'
  and (select auth.jwt() ->> 'user_role') in ('staff', 'admin')
);
