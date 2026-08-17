-- Singleton settings row so operational config (currently just the Resend
-- "from" address) can change from an admin UI instead of an env var +
-- redeploy. The `id = 1` check constraint plus a single seeded row is what
-- keeps this a singleton -- no app-level "find the one row" logic needed,
-- an insert of a second row is simply rejected.
create table public.app_settings (
  id integer primary key default 1,
  resend_from_address text,
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id = 1)
);

create trigger app_settings_set_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

insert into public.app_settings (id) values (1);

alter table public.app_settings enable row level security;

-- The from address isn't confidential -- it's visible in every email's
-- From: header regardless -- so read access is public, the same way the
-- from address itself is public once an email lands in an inbox. This lets
-- every Resend-sending call site (including the anonymous applicant-
-- facing submission flow) read it without needing an authenticated
-- Supabase client threaded through. Only admins can change it.
grant select on public.app_settings to anon, authenticated;
grant update on public.app_settings to authenticated;
revoke insert, delete on public.app_settings from anon, authenticated;

create policy "anyone can read app settings"
on public.app_settings for select
to anon, authenticated
using (true);

create policy "admin can update app settings"
on public.app_settings for update
to authenticated
using ((select auth.jwt() ->> 'user_role') = 'admin')
with check ((select auth.jwt() ->> 'user_role') = 'admin');
