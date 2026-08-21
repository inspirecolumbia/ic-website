-- Fixes a regression from the General Application template work: the public
-- apply page (app/positions/[slug]/apply/page.tsx) joins application_templates(name)
-- using the anon client to decide which form fields to render, but the
-- original migration's "the public application form doesn't need to query
-- this table yet" assumption (see 20260810130000_application_templates.sql)
-- never granted anon any access at all -- the join fails with a permission
-- error, the whole query returns nothing, and every job's /apply route
-- 404s. Template names aren't sensitive (just "Associate Application",
-- "General Application"), so a public read is fine -- write access stays
-- staff/admin only.

grant select on public.application_templates to anon;

create policy "anon can read templates for the public apply page"
on public.application_templates for select
to anon
using (true);
