-- apply_url becomes an optional external override. When null, the public
-- "Apply now" button defaults to the new internal /jobs/[slug]/apply form
-- instead of requiring every job posting to link out to a Google Form.

alter table public.jobs alter column apply_url drop not null;

comment on column public.jobs.apply_url is
  'Optional external override. When null, the public "Apply now" button uses the internal /jobs/[slug]/apply form.';
