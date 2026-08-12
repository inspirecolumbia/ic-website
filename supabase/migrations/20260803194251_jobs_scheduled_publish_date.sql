-- posting_date now doubles as a scheduled-publish date for the public
-- audience: staff can set status to published ahead of time with a future
-- posting_date, and the job simply won't be publicly visible until that
-- date arrives, no cron job needed. Staff/member/admin still see every job
-- regardless of status or date (they need to see what's scheduled), only
-- the anon-facing branch of this policy gains the date check.
drop policy "read jobs" on public.jobs;

create policy "read jobs"
on public.jobs for select
to anon, authenticated
using (
  (status = 'published' and (posting_date is null or posting_date <= current_date))
  or (select auth.jwt() ->> 'user_role') in ('member', 'staff', 'admin')
);
