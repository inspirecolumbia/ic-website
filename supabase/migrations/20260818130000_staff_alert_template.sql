-- Lets an admin route the new-application staff alert through a real Resend
-- template instead of the hardcoded plain-text message in
-- lib/email/templates.ts's staffAlertEmail(). Null (the default) means
-- "keep using the built-in message" -- no migration-time backfill needed,
-- existing installs just keep their current behavior.
alter table public.app_settings add column staff_alert_template_id text;
