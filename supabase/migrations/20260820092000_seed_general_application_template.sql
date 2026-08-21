-- Second application_templates row: same built-in form as "Associate
-- Application" minus the Team preferences section (see
-- components/JobApplicationForm.tsx's showTeamPreferences prop, matched by
-- this exact name in app/positions/[slug]/apply/page.tsx). Assign a job to
-- it from the job editor's "Application template" dropdown, same as any
-- other template.

insert into public.application_templates (name) values ('General Application');
