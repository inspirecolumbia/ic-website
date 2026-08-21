import { createClient } from "@/lib/supabase/public";
import { EMAIL_PATTERN } from "@/lib/applications";

// Admin-configurable, DB-backed default for the Resend "from" address (see
// supabase/migrations/20260816090000_app_settings.sql) -- read access is
// public (the address isn't secret, it's visible in every email's From:
// header regardless), so this works from any context including the
// anonymous applicant-facing submission flow. process.env.RESEND_FROM_ADDRESS
// is only the seed/fallback for a fresh environment with no row set yet.
export async function getResendFromAddress(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.from("app_settings").select("resend_from_address").eq("id", 1).maybeSingle();
  return data?.resend_from_address || process.env.RESEND_FROM_ADDRESS || null;
}

// Null (the default) means "send the new-application staff alert through
// the hardcoded plain-text message" (see staffAlertEmail in
// lib/email/templates.ts) -- set from Admin > Settings to route it through
// a real Resend template instead. Read access is public for the same
// reason getResendFromAddress's is: nothing here is confidential.
export async function getStaffAlertTemplateId(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.from("app_settings").select("staff_alert_template_id").eq("id", 1).maybeSingle();
  return data?.staff_alert_template_id ?? null;
}

// Blank (the default) falls back to the STAFF_ALERT_EMAIL env var, same
// shape as getResendFromAddress -- lets an admin point staff alerts at
// themselves for testing, or at a different inbox, without an env var +
// redeploy. Use getStaffAlertEmailOverride (raw, no fallback) when the
// caller needs to know whether an override is actually set, e.g. to
// populate the Settings form.
export async function getStaffAlertEmail(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.from("app_settings").select("staff_alert_email").eq("id", 1).maybeSingle();
  return data?.staff_alert_email || process.env.STAFF_ALERT_EMAIL || null;
}

export async function getStaffAlertEmailOverride(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.from("app_settings").select("staff_alert_email").eq("id", 1).maybeSingle();
  return data?.staff_alert_email ?? null;
}

// Per-capability admin feature toggles (Admin > Settings > Feature
// toggles). Default true on a failed/null read, matching the column's own
// default -- every action gated by one of these also independently checks
// role === "admin" first, so failing open here never grants a non-admin
// anything, it only means a transient read error doesn't spuriously
// disable a capability that's supposed to be on.
export async function getApplicationDeleteEnabled(): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase.from("app_settings").select("application_delete_enabled").eq("id", 1).maybeSingle();
  return data?.application_delete_enabled ?? true;
}

export async function getUserDeleteEnabled(): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase.from("app_settings").select("user_delete_enabled").eq("id", 1).maybeSingle();
  return data?.user_delete_enabled ?? true;
}

export async function getHistoryDeleteEnabled(): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase.from("app_settings").select("history_delete_enabled").eq("id", 1).maybeSingle();
  return data?.history_delete_enabled ?? true;
}

// Resend's `from` accepts either a bare email or a "Name <email>" form --
// this validates either shape by pulling out just the address part.
export function isValidFromAddress(value: string): boolean {
  const trimmed = value.trim();
  const angleMatch = trimmed.match(/^(.*)<([^<>]+)>$/);
  const email = angleMatch ? angleMatch[2].trim() : trimmed;
  return EMAIL_PATTERN.test(email);
}
