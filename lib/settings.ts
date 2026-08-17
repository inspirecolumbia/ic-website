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

// Resend's `from` accepts either a bare email or a "Name <email>" form --
// this validates either shape by pulling out just the address part.
export function isValidFromAddress(value: string): boolean {
  const trimmed = value.trim();
  const angleMatch = trimmed.match(/^(.*)<([^<>]+)>$/);
  const email = angleMatch ? angleMatch[2].trim() : trimmed;
  return EMAIL_PATTERN.test(email);
}
