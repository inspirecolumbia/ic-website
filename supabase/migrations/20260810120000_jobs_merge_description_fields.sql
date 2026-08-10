-- Merges description/responsibilities/qualifications into one Markdown-capable
-- description field. Generic backfill first (safe for any row, including
-- disposable test rows), then a specific content fix for the one real job
-- (associate-2026) correcting the "semester" wording (the program runs the
-- full school year, associates aren't leaving in December for a March
-- event) and adding the exact required qualification phrasing.

-- Generic backfill: append any existing responsibilities/qualifications as
-- Markdown bullet sections onto the existing description, for every row.
update public.jobs
set description = description
  || case when array_length(responsibilities, 1) > 0
       then E'\n\n## Responsibilities\n\n' || (
         select string_agg('- ' || r, E'\n') from unnest(responsibilities) as r
       )
       else '' end
  || case when array_length(qualifications, 1) > 0
       then E'\n\n## Qualifications\n\n' || (
         select string_agg('- ' || q, E'\n') from unnest(qualifications) as q
       )
       else '' end;

-- Specific content fix for the one real job posting.
update public.jobs
set
  description = E'Inspire Columbia''s Associate Program pairs college students from Columbia-area schools with a hands-on nonprofit team for the school year, working directly on the events and programming that reach the community.\n\n## Responsibilities\n\n- Join one of six IC teams and contribute to real deliverables each week\n- Attend weekly team meetings and periodic all-associate trainings\n- Support the planning and execution of at least one IC event during the school year\n- Collaborate with Lead Organizers and C-Suite staff on your team''s projects\n\n## Qualifications\n\n- Currently enrolled at a Columbia-area college or university\n- Live in or near Columbia, SC\n- Authorized to work for a US 501(c)(3) nonprofit on a volunteer basis\n- Reliable availability for weekly team commitments',
  commitment_type = 'Part-time, school-year-long'
where slug = 'associate-2026';

alter table public.jobs
  drop column responsibilities,
  drop column qualifications;
