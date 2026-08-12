-- Standing rule: no production applicant data may ever be sourced into this
-- file, or into any dev/branch database. The row below is already public,
-- non-sensitive job-posting content (mirrors data/jobs.json), not PII.

insert into public.jobs (
  slug, title, role, location, commitment_type, description,
  responsibilities, qualifications, apply_url, status, posting_date, published_at
) values (
  'associate-2026',
  'Associate',
  '2026 Associate Program',
  'Columbia, SC',
  'Part-time, semester-long',
  'Inspire Columbia''s Associate Program pairs college students from Columbia-area schools with a hands-on nonprofit team for a semester, working directly on the events and programming that reach the community.',
  array[
    'Join one of six IC teams and contribute to real deliverables each week',
    'Attend weekly team meetings and periodic all-associate trainings',
    'Support the planning and execution of at least one IC event during the semester',
    'Collaborate with Lead Organizers and C-Suite staff on your team''s projects'
  ],
  array[
    'Currently enrolled at a Columbia-area college or university',
    'Live in or near Columbia, SC',
    'Authorized to work for a US nonprofit',
    'Reliable availability for weekly team commitments'
  ],
  'https://forms.gle/CF5wu5vbbgYotFQf9',
  'published',
  '2026-07-01',
  now()
)
on conflict (slug) do nothing;
