-- Anon submits applications through this function only, not 4 separate
-- table inserts. Four independent anon INSERT calls left a real gap: if the
-- connection drops between them (plausible on mobile, right after two file
-- uploads already stressed the connection), the applications row could
-- commit while its children never do, an orphaned, incomplete record. A
-- single security definer function makes the whole submission one
-- transaction: either all 4 tables get written, or none do. Same pattern as
-- admin_bulk_delete_history (20260803220000_history_deletion.sql), just for
-- anon submissions instead of staff actions.
--
-- security definer means this runs with the function owner's privileges
-- regardless of caller, so it can still write these tables even after the
-- direct anon INSERT grants below are revoked. Because RLS is bypassed for
-- the duration of the call, this function must replicate the authorization
-- check itself (the job must be published) rather than relying on the table
-- policies, which is exactly what the old anon insert policy on
-- `applications` already enforced.

revoke insert on public.applications from anon;
revoke insert on public.application_documents from anon;
revoke insert on public.application_team_preferences from anon;
revoke insert on public.application_screening_answers from anon;
-- The anon insert policies on these 4 tables (from
-- 20260805090000_create_application_tables.sql) are now unreachable dead
-- code, left in place rather than dropped: matches this schema's existing
-- layered-permissions style (see the delete-grant-narrowed-by-RLS comment
-- on `applications` in that same migration) and avoids the extra risk of
-- editing policy definitions in this migration.

create function public.submit_application(
  p_application_id uuid,
  p_job_id uuid,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_school_email text,
  p_school text,
  p_major text,
  p_year_of_study text,
  p_gpa numeric,
  p_documents jsonb,
  p_team_preferences jsonb,
  p_screening_answers jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.jobs where jobs.id = p_job_id and jobs.status = 'published'
  ) then
    raise exception 'Job is not open for applications.';
  end if;

  insert into public.applications
    (id, job_id, first_name, last_name, email, phone, school_email, school, major, year_of_study, gpa)
  values
    (p_application_id, p_job_id, p_first_name, p_last_name, p_email, p_phone,
     p_school_email, p_school, p_major, p_year_of_study, p_gpa);

  insert into public.application_documents (application_id, document_type, file_name, storage_path)
  select p_application_id, doc ->> 'documentType', doc ->> 'fileName', doc ->> 'storagePath'
  from jsonb_array_elements(p_documents) as doc;

  insert into public.application_team_preferences (application_id, team_name, preference_rank)
  select p_application_id, pref ->> 'teamName', (pref ->> 'rank')::integer
  from jsonb_array_elements(p_team_preferences) as pref;

  insert into public.application_screening_answers (application_id, question, answer)
  select p_application_id, ans ->> 'question', ans ->> 'answer'
  from jsonb_array_elements(p_screening_answers) as ans;

  return p_application_id;
end;
$$;

grant execute on function public.submit_application(
  uuid, uuid, text, text, text, text, text, text, text, text, numeric, jsonb, jsonb, jsonb
) to anon;
