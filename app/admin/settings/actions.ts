"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createClerkSupabaseClient } from "@/lib/supabase/clerk";
import { isValidFromAddress } from "@/lib/settings";
import { listPublishedEmailTemplates, type EmailTemplateSummary } from "@/lib/email/send";

export async function updateResendFromAddress(address: string): Promise<{ error: string } | null> {
  const { sessionClaims } = await auth();
  const role = sessionClaims?.user_role as string | undefined;
  if (role !== "admin") return { error: "Only admins can change this." };

  const trimmed = address.trim();
  if (!isValidFromAddress(trimmed)) {
    return { error: 'Enter a valid email address, or "Name <email@domain.com>".' };
  }

  const supabase = createClerkSupabaseClient();
  const { error } = await supabase.from("app_settings").update({ resend_from_address: trimmed }).eq("id", 1);
  if (error) return { error: error.message };

  // Every page that reads getResendFromAddress() needs its cached render
  // invalidated, not just this settings page -- mass email displays it too.
  revalidatePath("/admin/settings");
  revalidatePath("/admin/applications/mass-email");
  return null;
}

export async function listStaffAlertTemplateOptions(): Promise<
  { templates: EmailTemplateSummary[] } | { error: string }
> {
  const { sessionClaims } = await auth();
  const role = sessionClaims?.user_role as string | undefined;
  if (role !== "admin") return { error: "Only admins can change this." };

  try {
    return { templates: await listPublishedEmailTemplates() };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to load templates." };
  }
}

// null clears it back to the built-in plain-text staff alert message (see
// staffAlertEmail in lib/email/templates.ts).
export async function updateStaffAlertTemplateId(templateId: string | null): Promise<{ error: string } | null> {
  const { sessionClaims } = await auth();
  const role = sessionClaims?.user_role as string | undefined;
  if (role !== "admin") return { error: "Only admins can change this." };

  const supabase = createClerkSupabaseClient();
  const { error } = await supabase.from("app_settings").update({ staff_alert_template_id: templateId }).eq("id", 1);
  if (error) return { error: error.message };

  revalidatePath("/admin/settings");
  return null;
}

// A closed key -> {column, revalidate paths} map, not three near-identical
// actions -- keeps the column actually written to Supabase always one of
// these three literal, migration-defined names (TypeScript rejects any
// other key at the call site), never a client-controlled string.
const FEATURE_TOGGLES = {
  application_delete_enabled: {
    column: "application_delete_enabled" as const,
    revalidate: ["/admin/settings", "/admin/applications", "/admin/applications/[id]"] as const,
  },
  user_delete_enabled: {
    column: "user_delete_enabled" as const,
    revalidate: ["/admin/settings", "/admin/users"] as const,
  },
  history_delete_enabled: {
    column: "history_delete_enabled" as const,
    revalidate: ["/admin/settings", "/admin/history"] as const,
  },
} satisfies Record<string, { column: string; revalidate: readonly string[] }>;

export type FeatureToggleKey = keyof typeof FEATURE_TOGGLES;

export async function updateFeatureToggle(key: FeatureToggleKey, enabled: boolean): Promise<{ error: string } | null> {
  const { sessionClaims } = await auth();
  const role = sessionClaims?.user_role as string | undefined;
  if (role !== "admin") return { error: "Only admins can change this." };

  const toggle = FEATURE_TOGGLES[key];
  const supabase = createClerkSupabaseClient();
  // A computed { [key]: enabled } widens to a generic string index
  // signature even with `key` typed as the closed FeatureToggleKey union
  // (a known TS limitation for computed properties), which Supabase's
  // generated types then reject -- a switch keeps each branch's update
  // payload a proper literal shape instead.
  const update =
    key === "application_delete_enabled"
      ? { application_delete_enabled: enabled }
      : key === "user_delete_enabled"
        ? { user_delete_enabled: enabled }
        : { history_delete_enabled: enabled };
  const { error } = await supabase.from("app_settings").update(update).eq("id", 1);
  if (error) return { error: error.message };

  for (const path of toggle.revalidate) {
    // /admin/applications/[id] is a dynamic route with no concrete id here
    // -- revalidatePath needs the "layout" type to invalidate every id
    // under it at once; a bare call with no type silently no-ops instead
    // of matching anything.
    if (path === "/admin/applications/[id]") {
      revalidatePath(path, "layout");
    } else {
      revalidatePath(path);
    }
  }
  return null;
}
