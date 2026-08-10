-- Optional closing date, symmetric to posting_date's scheduled-publish
-- pattern: a job with a past closing_date simply stops being publicly
-- visible, no cron job needed, same "computed visibility" approach as
-- posting_date rather than an automatic status-column transition. status
-- stays 'published' underneath; the public read policy is what actually
-- hides it. Staff/member/admin still see every job regardless, same as
-- posting_date's behavior.

alter table public.jobs add column closing_date date;

drop policy "read jobs" on public.jobs;

create policy "read jobs"
on public.jobs for select
to anon, authenticated
using (
  (status = 'published'
    and (posting_date is null or posting_date <= current_date)
    and (closing_date is null or closing_date >= current_date))
  or (select auth.jwt() ->> 'user_role') in ('member', 'staff', 'admin')
);
