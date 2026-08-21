-- DB-backed override for the staff alert recipient, following the same
-- pattern as resend_from_address: blank means "fall back to the
-- STAFF_ALERT_EMAIL env var", so an admin can point alerts at themselves for
-- testing (or at info@inspirecolumbia.org) without an env var + redeploy.
alter table public.app_settings add column staff_alert_email text;
