-- Per-capability admin feature toggles (Admin > Settings > Feature
-- toggles). No new RLS policy needed for these columns -- app_settings'
-- existing "anyone can read / admin can update" policies (see
-- 20260816090000_app_settings.sql) already cover any column on this
-- table, same continuation of that decision as staff_alert_template_id.
alter table public.app_settings
  add column application_delete_enabled boolean not null default true,
  add column user_delete_enabled boolean not null default true,
  add column history_delete_enabled boolean not null default true;

-- Admin can delete application-documents Storage objects, mirroring the
-- job-photos bucket's explicit admin-delete policy (20260811050000_jobs_photo.sql).
-- This bucket previously had insert (anon) + select (staff/admin) only, no
-- delete policy at all -- without this, deleting an application would
-- silently fail to remove its resume/transcript objects (RLS filters them
-- out of the delete, 0 rows affected, no error), leaving them orphaned in
-- Storage forever.
create policy "admin can delete application documents"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'application-documents'
  and (select auth.jwt() ->> 'user_role') = 'admin'
);
