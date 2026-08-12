-- Staff want to schedule a job's open/close down to a specific time, not
-- just a day (e.g. "publish at 9am Monday"). date can't carry that, so both
-- columns become timestamptz. Existing values cast to midnight UTC on that
-- date, which staff can adjust afterward if they want a specific time.
drop policy "read jobs" on public.jobs;

alter table public.jobs
  alter column posting_date type timestamptz using posting_date::timestamptz,
  alter column closing_date type timestamptz using closing_date::timestamptz;

create policy "read jobs"
on public.jobs for select
to anon, authenticated
using (
  (status = 'published'
    and (posting_date is null or posting_date <= now())
    and (closing_date is null or closing_date >= now()))
  or (select auth.jwt() ->> 'user_role') in ('member', 'staff', 'admin')
);
