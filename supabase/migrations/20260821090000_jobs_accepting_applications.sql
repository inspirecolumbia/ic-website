-- A job-level flag, not a 3rd application_templates row -- unlike a real
-- template, "not accepting applications yet" isn't a field set for the
-- built-in form to render, it's the absence of one: /apply shows a genuine
-- 404 instead (see app/positions/[slug]/apply/page.tsx). Defaults true so
-- every existing job keeps behaving exactly as it does today.
alter table public.jobs
  add column accepting_applications boolean not null default true;
