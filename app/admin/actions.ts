"use server";

import { createClerkSupabaseClient } from "@/lib/supabase/clerk";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/database.types";

type JobStatus = Database["public"]["Enums"]["job_status"];

function splitLines(value: FormDataEntryValue | null): string[] {
  return (value as string ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

// display_order is intentionally not part of the form, ordering is set on
// the jobs list via drag-and-drop or the up/down buttons (reorderJobs
// below), never via this form. Omitting it here means create leaves it at
// the column default and update never overwrites it.
function jobFromFormData(formData: FormData) {
  return {
    slug: formData.get("slug") as string,
    title: formData.get("title") as string,
    role: formData.get("role") as string,
    location: formData.get("location") as string,
    commitment_type: formData.get("commitment_type") as string,
    posting_date: (formData.get("posting_date") as string) || null,
    description: formData.get("description") as string,
    responsibilities: splitLines(formData.get("responsibilities")),
    qualifications: splitLines(formData.get("qualifications")),
    apply_url: formData.get("apply_url") as string,
  };
}

export type FormState = { error: string } | { ok: true; id?: string } | null;

const todayIso = () => new Date().toISOString().slice(0, 10);

function validatePostingDate(postingDate: string | null): string | null {
  if (postingDate && postingDate < todayIso()) {
    return "Posting date can't be in the past.";
  }
  return null;
}

export async function createJob(prevState: FormState, formData: FormData): Promise<FormState> {
  const job = jobFromFormData(formData);
  const dateError = validatePostingDate(job.posting_date);
  if (dateError) return { error: dateError };

  const supabase = createClerkSupabaseClient();
  const { data, error } = await supabase.from("jobs").insert(job).select("id").single();

  if (error) return { error: error.message };
  revalidatePath("/admin/jobs");
  return { ok: true, id: data.id };
}

export async function updateJob(id: string, prevState: FormState, formData: FormData): Promise<FormState> {
  const job = jobFromFormData(formData);
  const dateError = validatePostingDate(job.posting_date);
  if (dateError) return { error: dateError };

  const supabase = createClerkSupabaseClient();
  const { error } = await supabase
    .from("jobs")
    .update({
      ...job,
      status: formData.get("status") as JobStatus,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/jobs");
  return { ok: true };
}

// Strips a previous -copy-N suffix so duplicating an already-duplicated job
// doesn't stack suffixes (associate-2026-copy-1-copy-1-...), duplicates
// always number off the original's own slug.
function baseSlug(slug: string) {
  return slug.replace(/-copy-\d+$/, "");
}

export async function duplicateJob(id: string) {
  const supabase = createClerkSupabaseClient();
  const { data: original, error: fetchError } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError) return;

  const base = baseSlug(original.slug);
  const { data: existing } = await supabase
    .from("jobs")
    .select("slug")
    .like("slug", `${base}-copy-%`);

  const usedNumbers = new Set(
    (existing ?? [])
      .map((row) => {
        const match = row.slug.match(new RegExp(`^${base}-copy-(\\d+)$`));
        return match ? Number(match[1]) : null;
      })
      .filter((n): n is number => n !== null)
  );
  let n = 1;
  while (usedNumbers.has(n)) n++;

  const { error: insertError } = await supabase.from("jobs").insert({
    slug: `${base}-copy-${n}`,
    title: original.title,
    role: original.role,
    location: original.location,
    commitment_type: original.commitment_type,
    posting_date: original.posting_date,
    description: original.description,
    responsibilities: original.responsibilities,
    qualifications: original.qualifications,
    apply_url: original.apply_url,
    display_order: original.display_order,
    status: "draft",
    published_at: null,
  });

  if (insertError) return;
  revalidatePath("/admin/jobs");
}

export async function deleteJob(id: string) {
  const supabase = createClerkSupabaseClient();
  await supabase.from("jobs").delete().eq("id", id);
  revalidatePath("/admin/jobs");
}

export async function bulkDeleteJobs(ids: string[]): Promise<{ error: string } | null> {
  const supabase = createClerkSupabaseClient();
  const { error } = await supabase.from("jobs").delete().in("id", ids);
  revalidatePath("/admin/jobs");
  return error ? { error: error.message } : null;
}

export async function reorderJobs(orderedIds: string[]): Promise<{ error: string } | null> {
  const supabase = createClerkSupabaseClient();
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("jobs").update({ display_order: index }).eq("id", id)
    )
  );
  const failed = results.find((r) => r.error);
  revalidatePath("/admin/jobs");
  return failed ? { error: failed.error!.message } : null;
}

export type HistoryDeleteScope = "selected" | "page" | "all_matching";

export async function bulkDeleteHistory(
  ids: string[],
  scope: HistoryDeleteScope,
  filtersSnapshot: Record<string, unknown> | null
): Promise<{ error: string } | { deletedCount: number }> {
  const supabase = createClerkSupabaseClient();
  const { data, error } = await supabase.rpc("admin_bulk_delete_history", {
    p_ids: ids,
    p_scope: scope,
    p_filters: filtersSnapshot as Database["public"]["Tables"]["security_events"]["Row"]["filters_snapshot"],
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/history");
  return { deletedCount: data ?? 0 };
}

export async function transitionStatus(id: string, status: JobStatus) {
  const supabase = createClerkSupabaseClient();

  if (status === "published") {
    const { data: current } = await supabase.from("jobs").select("published_at").eq("id", id).single();
    await supabase
      .from("jobs")
      .update({ status, published_at: current?.published_at ?? new Date().toISOString() })
      .eq("id", id);
  } else {
    await supabase.from("jobs").update({ status }).eq("id", id);
  }

  revalidatePath("/admin/jobs");
}
