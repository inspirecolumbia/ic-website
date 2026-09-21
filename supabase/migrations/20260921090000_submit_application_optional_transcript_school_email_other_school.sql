-- Three relaxations to the application form's rules:
--
-- 1. The unofficial transcript upload is now optional. Only the resume is
--    still required; a submission with no transcript document simply has no
--    application_documents row of type 'transcript'.
-- 2. School email is now optional. When one is provided it must still be a
--    valid email, and it must match the selected school's domain when that
--    school has a known domain. A blank value is stored as null.
-- 3. School accepts "Other" in addition to the fixed list. "Other" has no
--    known domain, so the domain check is skipped for it, and the name is
--    stored as the literal string "Other" (no free-typed school name).
--
-- Only loosens validation, so it's safe to apply before the matching app
-- code ships: the currently deployed form still submits a transcript, a
-- school email, and a listed school, all of which remain valid. Same
-- signature, so CREATE OR REPLACE preserves the existing anon EXECUTE grant.

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
  -- Keep in sync with lib/screening.ts's TEAMS constant. Team 6 ("Logistics
  -- and Operations / AV Production") has no bare entry here -- applicants
  -- must submit one of its two sub-tracks directly, so a bare "team 6"
  -- value is never storable.
  v_valid_teams text[] := array[
    'Nonprofit Finances and Legal',
    'Technology and Web Development',
    'Marketing and Press Strategy',
    'Sponsorships and Corporate Partnerships',
    'Speaker Curation and Mentorship',
    'Production',
    'Logistics & Operations'
  ];
  -- Keep in sync with lib/screening.ts's SCREENING_QUESTIONS required
  -- yes/no question text. The optional free-text question isn't checked.
  v_yes_no_questions text[] := array[
    'Do you currently live in or near Columbia, SC?',
    'Are you authorized to work in the United States?',
    'Would you require visa sponsorship from an employer, now or in the future?'
  ];
  -- Keep in sync with lib/screening.ts's SCHOOL_EMAIL_DOMAINS. The keys are
  -- the fixed list of schools with a known email domain; "Other" (below) is
  -- the one additional accepted school, with no domain to check against.
  v_school_email_domains jsonb := '{
    "Allen University": ["allenuniversity.edu"],
    "Benedict College": ["benedict.edu"],
    "Columbia College": ["columbiasc.edu"],
    "Columbia International University": ["ciu.edu"],
    "Midlands Technical College": ["midlandstech.edu"],
    "University of South Carolina, Columbia": ["email.sc.edu", "sc.edu"]
  }'::jsonb;
  -- Keep in sync with lib/screening.ts's OTHER_SCHOOL.
  v_other_school text := 'Other';
  v_school_email text := nullif(trim(coalesce(p_school_email, '')), '');
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
  if not coalesce(v_school_email_domains ? p_school or p_school = v_other_school, false) then
    raise exception 'Please select a valid school.';
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

  -- School email is optional. When provided it must be a valid address, and
  -- for a school with a known domain it must match that domain.
  if v_school_email is not null then
    if v_school_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
      raise exception 'A valid school email is required.';
    end if;

    if p_school <> v_other_school and not exists (
      select 1 from jsonb_array_elements_text(v_school_email_domains -> p_school) as domain
      where lower(split_part(v_school_email, '@', 2)) = domain
    ) then
      raise exception 'School email must match the selected school''s domain.';
    end if;
  end if;

  -- Keep in sync with lib/applications.ts's PHONE_PATTERN.
  if trim(coalesce(p_phone, '')) = '' then
    raise exception 'Phone number is required.';
  end if;
  if p_phone !~ '^(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$' then
    raise exception 'Please enter a valid phone number.';
  end if;

  if p_gpa is not null and (p_gpa::text = 'NaN' or p_gpa < 0 or p_gpa > 4) then
    raise exception 'GPA must be a number between 0 and 4.';
  end if;

  -- 0: this job's form has no Team preferences section at all. 3: a
  -- complete, valid set of preferences. Anything else is a form that has
  -- the section but wasn't filled out correctly.
  if jsonb_array_length(p_team_preferences) not in (0, 3) then
    raise exception 'Exactly 3 team preferences are required.';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_team_preferences) as pref
    where not (pref ->> 'teamName' = any(v_valid_teams))
  ) then
    raise exception 'Invalid team selection.';
  end if;

  if jsonb_array_length(p_team_preferences) = 3 and (
    select count(distinct pref ->> 'teamName') from jsonb_array_elements(p_team_preferences) as pref
  ) <> 3 then
    raise exception 'Team preferences must be 3 distinct teams.';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_screening_answers) as ans
    where (ans ->> 'question') = any(v_yes_no_questions)
    and (ans ->> 'answer') not in ('Yes', 'No')
  ) then
    raise exception 'Invalid answer to a yes/no question.';
  end if;

  -- Only the resume is required; the transcript is optional.
  if not exists (
    select 1 from jsonb_array_elements(p_documents) as doc
    where doc ->> 'documentType' = 'resume' and coalesce(doc ->> 'storagePath', '') <> ''
  ) then
    raise exception 'A resume upload is required.';
  end if;

  insert into public.applications
    (id, job_id, first_name, last_name, email, phone, school_email, school, major, year_of_study, gpa)
  values
    (p_application_id, p_job_id, p_first_name, p_last_name, p_email, p_phone,
     v_school_email, p_school, p_major, p_year_of_study, p_gpa);

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
