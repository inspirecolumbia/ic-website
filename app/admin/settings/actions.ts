"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createClerkSupabaseClient } from "@/lib/supabase/clerk";
import { isValidFromAddress } from "@/lib/settings";

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
