-- Two validation gaps found by the user testing the live form:
-- 1. The phone regex only checked allowed characters, not digit count, so
--    a string of nothing but dashes or dots passed as a "valid" phone
--    number. Replaced with a real 10-digit US number shape (11 with a
--    leading 1), same fix as lib/applications.ts's PHONE_PATTERN.
-- 2. School email had no relationship to the school actually selected, so
--    picking a real school but typing any email at all was accepted.
--    School emails are now checked against that school's real student-email
--    domain (verified against each institution's own site 2026-08-10),
--    skipped entirely for a free-typed "Other" school with no known domain.
-- Same signature, so CREATE OR REPLACE preserves the existing anon EXECUTE
-- grant unchanged.

create or replace function public.submit_application(
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
declare
  -- Keep in sync with lib/screening.ts's TEAMS constant.
  v_valid_teams text[] := array[
    'Nonprofit Finances and Legal',
    'Technology and Web Development',
    'Marketing and Press Strategy',
    'Sponsorships, Corporate Partnerships, and Fundraising',
    'Speaker Curation and Mentorship',
    'Production and Operations'
  ];
  -- Keep in sync with lib/screening.ts's SCREENING_QUESTIONS required
  -- yes/no question text. The optional free-text question isn't checked.
  v_yes_no_questions text[] := array[
    'Do you currently live in or near Columbia, SC?',
    'Are you authorized to work in the United States?',
    'Would you require visa sponsorship from an employer, now or in the future?'
  ];
  -- Keep in sync with lib/screening.ts's SCHOOL_EMAIL_DOMAINS. A school not
  -- present here (i.e. a free-typed "Other" school) skips the domain check.
  v_school_email_domains jsonb := '{
    "Allen University": ["allenuniversity.edu"],
    "Benedict College": ["benedict.edu"],
    "Columbia College": ["columbiasc.edu"],
    "Columbia International University": ["ciu.edu"],
    "Midlands Technical College": ["midlandstech.edu"],
    "University of South Carolina, Columbia": ["email.sc.edu", "sc.edu"]
  }'::jsonb;
  v_allowed_school_email_domains jsonb;
begin
  if not exists (
    select 1 from public.jobs where jobs.id = p_job_id and jobs.status = 'published'
  ) then
    raise exception 'Job is not open for applications.';
  end if;

  if trim(coalesce(p_first_name, '')) = '' then
    raise exception 'First name is required.';
  end if;
  if trim(coalesce(p_last_name, '')) = '' then
    raise exception 'Last name is required.';
  end if;
  if trim(coalesce(p_school, '')) = '' then
    raise exception 'School is required.';
  end if;
  if trim(coalesce(p_major, '')) = '' then
    raise exception 'Major is required.';
  end if;
  if trim(coalesce(p_year_of_study, '')) = '' then
    raise exception 'Year of study is required.';
  end if;

  if p_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'A valid email is required.';
  end if;
  if p_school_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'A valid school email is required.';
  end if;

  v_allowed_school_email_domains := v_school_email_domains -> p_school;
  if v_allowed_school_email_domains is not null
    and not exists (
      select 1 from jsonb_array_elements_text(v_allowed_school_email_domains) as domain
      where lower(split_part(p_school_email, '@', 2)) = domain
    )
  then
    raise exception 'School email must match the selected school''s domain.';
  end if;

  -- Keep in sync with lib/applications.ts's PHONE_PATTERN. Optional field:
  -- only validated when provided. Requires a real 10-digit US number (11
  -- with a leading 1), not just an allowed character set.
  if p_phone is not null and trim(p_phone) <> ''
    and p_phone !~ '^(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$'
  then
    raise exception 'Please enter a valid phone number.';
  end if;

  if p_gpa is not null and (p_gpa::text = 'NaN' or p_gpa < 0 or p_gpa > 4) then
    raise exception 'GPA must be a number between 0 and 4.';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_team_preferences) as pref
    where not (pref ->> 'teamName' = any(v_valid_teams))
  ) then
    raise exception 'Invalid team selection.';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_screening_answers) as ans
    where (ans ->> 'question') = any(v_yes_no_questions)
    and (ans ->> 'answer') not in ('Yes', 'No')
  ) then
    raise exception 'Invalid answer to a yes/no question.';
  end if;

  if not exists (
    select 1 from jsonb_array_elements(p_documents) as doc
    where doc ->> 'documentType' = 'resume' and coalesce(doc ->> 'storagePath', '') <> ''
  ) then
    raise exception 'A resume upload is required.';
  end if;
  if not exists (
    select 1 from jsonb_array_elements(p_documents) as doc
    where doc ->> 'documentType' = 'transcript' and coalesce(doc ->> 'storagePath', '') <> ''
  ) then
    raise exception 'An unofficial transcript upload is required.';
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
