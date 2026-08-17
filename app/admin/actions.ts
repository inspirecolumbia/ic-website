"use server";

import { auth } from "@clerk/nextjs/server";
import { createClerkSupabaseClient } from "@/lib/supabase/clerk";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/database.types";
import {
  createApplicationDocumentSignedUrl,
  deleteJobPhotoObject,
  JobPhotoUploadError,
  uploadJobPhoto,
} from "@/lib/storage";
import { isReviewerNoteEmpty, sanitizeReviewerNoteHtml } from "@/lib/reviewer-notes";
import { getEmailTemplateDetail, sendTemplateEmail, type EmailTemplateDetail } from "@/lib/email/send";
import { resolveRecipientVariables, type MassEmailRecipient } from "@/lib/mass-email";

type JobStatus = Database["public"]["Enums"]["job_status"];
type ApplicationStatus = Database["public"]["Enums"]["application_status"];

// display_order is intentionally not part of the form, ordering is set on
// the jobs list via drag-and-drop or the up/down buttons (reorderJobs
// below), never via this form. Omitting it here means create leaves it at
// the column default and update never overwrites it.
function jobFromFormData(formData: FormData) {
  const templateId = formData.get("application_template_id") as string | null;
  return {
    slug: formData.get("slug") as string,
    title: formData.get("title") as string,
    role: formData.get("role") as string,
    location: formData.get("location") as string,
    commitment_type: formData.get("commitment_type") as string,
    posting_date: (formData.get("posting_date") as string) || null,
    closing_date: (formData.get("closing_date") as string) || null,
    description: formData.get("description") as string,
    apply_url: (formData.get("apply_url") as string) || null,
    // "none" is the form's sentinel for "no template" -- a real Select
    // value can't be an empty string in this UI kit, so it can't just be "".
    application_template_id: templateId && templateId !== "none" ? templateId : null,
  };
}

export type FormState = { error: string } | { ok: true; id?: string; notice?: string } | null;

const nowIso = () => new Date().toISOString();

// posting_date/closing_date arrive as full ISO-with-Z instants (converted
// client-side from the admin form's local datetime-local inputs -- see
// JobForm.tsx). Plain string comparison still gives the right chronological
// answer for that format, no need to parse into Date objects.
//
// A past date/time isn't rejected -- it's quietly common (a form left open
// past midnight, a timezone mixup) rather than a deliberate choice, so it's
// clamped forward to "now" instead of blocking the save. The caller surfaces
// this back to the admin as a non-blocking notice, not silently.
function clampToNowIfPast(date: string | null, now: string): { value: string | null; wasClamped: boolean } {
  if (date && date < now) {
    return { value: now, wasClamped: true };
  }
  return { value: date, wasClamped: false };
}

function validateClosingDate(postingDate: string | null, closingDate: string | null): string | null {
  if (closingDate && postingDate && closingDate < postingDate) {
    return "Closing date/time can't be before the posting date/time.";
  }
  return null;
}

function pastDateClampNotice(postingClamped: boolean, closingClamped: boolean): string | undefined {
  if (postingClamped && closingClamped) {
    return "Posting and closing times were in the past, so both were set to now.";
  }
  if (postingClamped) return "Posting time was in the past, so it was set to now.";
  if (closingClamped) return "Closing time was in the past, so it was set to now.";
  return undefined;
}

function joinNotices(...notices: (string | undefined)[]): string | undefined {
  const present = notices.filter((n): n is string => Boolean(n));
  return present.length ? present.join(" ") : undefined;
}

function photoUploadErrorMessage(err: unknown): string {
  return err instanceof JobPhotoUploadError
    ? err.message
    : "We couldn't upload that photo. Please check your connection and try again.";
}

// Server-side backstop for the required fields -- the admin form already
// marks these required via HTML, but that alone is bypassable (direct
// request, or the attribute silently missing), and without this the only
// backstop was a raw Postgres NOT NULL violation surfacing as an ugly
// unformatted error instead of a friendly message.
function validateJobFields(job: ReturnType<typeof jobFromFormData>): string | null {
  if (!job.title?.trim()) return "Title is required.";
  if (!job.slug?.trim()) return "Web address is required.";
  if (!job.role?.trim()) return "Program / role is required.";
  if (!job.location?.trim()) return "Location is required.";
  if (!job.description?.trim()) return "Description is required.";
  return null;
}

export async function createJob(prevState: FormState, formData: FormData): Promise<FormState> {
  const job = jobFromFormData(formData);
  const fieldError = validateJobFields(job);
  if (fieldError) return { error: fieldError };

  const now = nowIso();
  const postingClamp = clampToNowIfPast(job.posting_date, now);
  const closingClamp = clampToNowIfPast(job.closing_date, now);
  job.posting_date = postingClamp.value;
  job.closing_date = closingClamp.value;

  const dateError = validateClosingDate(job.posting_date, job.closing_date);
  if (dateError) return { error: dateError };

  const photo = formData.get("photo");
  const supabase = createClerkSupabaseClient();
  const { data, error } = await supabase.from("jobs").insert(job).select("id").single();

  if (error) return { error: error.message };

  // The job row already exists at this point -- a photo upload/association
  // failure here is reported as a notice, not an error, so the admin
  // doesn't think job creation itself failed and end up with a duplicate on
  // retry.
  let photoError: string | undefined;
  if (photo instanceof File && photo.size > 0) {
    try {
      const photoPath = await uploadJobPhoto(supabase, data.id, photo);
      const { error: photoUpdateError } = await supabase
        .from("jobs")
        .update({ photo_path: photoPath })
        .eq("id", data.id);
      if (photoUpdateError) {
        // Roll back the upload -- the database never ended up referencing
        // it, so leaving it in Storage would just orphan the object.
        await deleteJobPhotoObject(supabase, photoPath);
        photoError = photoUpdateError.message;
      }
    } catch (err) {
      photoError = photoUploadErrorMessage(err);
    }
  }

  revalidatePath("/admin/jobs");
  revalidatePath("/positions");
  return {
    ok: true,
    id: data.id,
    notice: joinNotices(
      pastDateClampNotice(postingClamp.wasClamped, closingClamp.wasClamped),
      photoError ? `Job created, but the photo didn't upload: ${photoError}` : undefined
    ),
  };
}

export async function updateJob(id: string, prevState: FormState, formData: FormData): Promise<FormState> {
  const job = jobFromFormData(formData);
  const fieldError = validateJobFields(job);
  if (fieldError) return { error: fieldError };

  const now = nowIso();
  const postingClamp = clampToNowIfPast(job.posting_date, now);
  const closingClamp = clampToNowIfPast(job.closing_date, now);
  job.posting_date = postingClamp.value;
  job.closing_date = closingClamp.value;

  const dateError = validateClosingDate(job.posting_date, job.closing_date);
  if (dateError) return { error: dateError };

  const photo = formData.get("photo");
  const removePhoto = formData.get("remove_photo") === "true";
  const currentPhotoPath = (formData.get("current_photo_path") as string) || null;
  const status = formData.get("status") as JobStatus;
  const supabase = createClerkSupabaseClient();

  // Default: keep whatever photo was already there.
  let photoPath = currentPhotoPath;
  let photoError: string | undefined;
  let uploadedPathForRollback: string | null = null;
  let oldPathToDeleteAfterSuccess: string | null = null;

  if (photo instanceof File && photo.size > 0) {
    // Replace: upload the new file to its own fresh path first, before
    // touching the database row or the old object -- the old photo stays
    // live the whole time, so a failure anywhere in this sequence still
    // leaves the job with a working photo reference.
    try {
      const newPath = await uploadJobPhoto(supabase, id, photo);
      photoPath = newPath;
      uploadedPathForRollback = newPath;
      if (currentPhotoPath) oldPathToDeleteAfterSuccess = currentPhotoPath;
    } catch (err) {
      // A failed upload keeps whatever photo was already there rather than
      // clearing it -- losing the existing photo because the replacement
      // upload hit a network blip would be a worse outcome than just not
      // swapping it.
      photoPath = currentPhotoPath;
      photoError = photoUploadErrorMessage(err);
    }
  } else if (removePhoto && currentPhotoPath) {
    // Remove: the database reference is cleared by the update below; the
    // Storage object itself is only deleted once that's confirmed to have
    // actually landed.
    photoPath = null;
    oldPathToDeleteAfterSuccess = currentPhotoPath;
  }

  const { error } = await supabase
    .from("jobs")
    .update({
      ...job,
      status,
      photo_path: photoPath,
      // published_at tracks the most recent time this job went live, not
      // the first -- re-publishing after a closure should update it, same
      // as transitionStatus below.
      ...(status === "published" ? { published_at: new Date().toISOString() } : {}),
    })
    .eq("id", id);

  if (error) {
    // The main update failed -- if a new photo was uploaded for it, it's
    // now an orphan the database never ended up referencing.
    if (uploadedPathForRollback) await deleteJobPhotoObject(supabase, uploadedPathForRollback);
    return { error: error.message };
  }

  // Only now, after the database confirms the new state, is it safe to
  // delete whatever the old photo pointed to.
  if (oldPathToDeleteAfterSuccess) await deleteJobPhotoObject(supabase, oldPathToDeleteAfterSuccess);

  revalidatePath("/admin/jobs");
  revalidatePath("/positions");
  revalidatePath(`/positions/${job.slug}`);
  return {
    ok: true,
    notice: joinNotices(
      pastDateClampNotice(postingClamp.wasClamped, closingClamp.wasClamped),
      photoError ? `Job saved, but the photo didn't upload: ${photoError}` : undefined
    ),
  };
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
    closing_date: original.closing_date,
    description: original.description,
    apply_url: original.apply_url,
    application_template_id: original.application_template_id,
    display_order: original.display_order,
    status: "draft",
    published_at: null,
  });

  if (insertError) return;
  revalidatePath("/admin/jobs");
}

export async function deleteJob(id: string): Promise<{ error: string } | null> {
  const supabase = createClerkSupabaseClient();
  const { data: existing } = await supabase.from("jobs").select("photo_path").eq("id", id).single();
  const { error } = await supabase.from("jobs").delete().eq("id", id);

  if (error) return { error: error.message };
  // Best-effort: the row is already gone either way, so a cleanup failure
  // here just leaves an orphaned Storage object rather than blocking the
  // delete the admin actually asked for.
  if (existing?.photo_path) await deleteJobPhotoObject(supabase, existing.photo_path);

  revalidatePath("/admin/jobs");
  revalidatePath("/positions");
  return null;
}

export async function bulkDeleteJobs(ids: string[]): Promise<{ error: string } | null> {
  const supabase = createClerkSupabaseClient();
  const { data: existing } = await supabase.from("jobs").select("photo_path").in("id", ids);
  const { error } = await supabase.from("jobs").delete().in("id", ids);
  revalidatePath("/admin/jobs");
  revalidatePath("/positions");
  if (error) return { error: error.message };

  const photoPaths = (existing ?? []).map((row) => row.photo_path).filter((p): p is string => Boolean(p));
  await Promise.all(photoPaths.map((path) => deleteJobPhotoObject(supabase, path)));
  return null;
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
  revalidatePath("/positions");
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

export async function transitionStatus(id: string, status: JobStatus): Promise<{ error: string } | null> {
  const supabase = createClerkSupabaseClient();

  if (status === "published") {
    // published_at tracks the most recent publish, not the first -- always
    // overwritten here so staff can see when a re-published job actually
    // went live again, not the date of its original publish.
    const { error } = await supabase
      .from("jobs")
      .update({ status, published_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("jobs").update({ status }).eq("id", id);
    if (error) return { error: error.message };
  }

  revalidatePath("/admin/jobs");
  revalidatePath("/positions");
  return null;
}

// Trusts the row's own storage_path rather than recomputing it from the
// application/document-type pair -- looking it up by the document's own id
// means this works the same way regardless of how that path was derived.
//
// The role check here is redundant with RLS (staff/admin-only select on
// application_documents already blocks a member), but the spec calls for
// enforcement in the server action itself too, not just the data layer --
// so a future refactor that swaps in a different Supabase client factory
// can't silently drop the restriction. Same reasoning applies to every
// other applications-related action below.
export async function getApplicationDocumentUrl(
  applicationDocumentId: string,
  mode: "preview" | "download" = "preview"
): Promise<{ url: string } | { error: string }> {
  const { sessionClaims } = await auth();
  const role = sessionClaims?.user_role as string | undefined;
  // Generic message, doesn't distinguish "not authorized" from "not found"
  // -- an applicant id or document id shouldn't be confirmable to exist by
  // probing this action with the wrong role.
  if (role !== "staff" && role !== "admin") return { error: "Document not found." };

  const supabase = createClerkSupabaseClient();
  const { data, error } = await supabase
    .from("application_documents")
    .select("storage_path, file_name")
    .eq("id", applicationDocumentId)
    .single();

  if (error || !data) return { error: "Document not found." };
  if (!data.storage_path) return { error: "This document is unavailable." };

  return createApplicationDocumentSignedUrl(supabase, data.storage_path, {
    // Preview embeds the URL in an iframe for as long as the panel stays
    // open, so it needs more headroom than a one-shot download click.
    expiresInSeconds: mode === "preview" ? 300 : 60,
    download: mode === "download" ? data.file_name : false,
  });
}

// Status changes are internal only -- never emails or otherwise notifies
// the applicant. Deliberately does not fetch first_name/email/job_id like
// an earlier version of this function did, since that data was only ever
// needed to build a notification that must not exist.
export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus
): Promise<{ error: string } | null> {
  const { sessionClaims } = await auth();
  const role = sessionClaims?.user_role as string | undefined;
  if (role !== "staff" && role !== "admin") return { error: "Not authorized." };

  const supabase = createClerkSupabaseClient();
  const { error } = await supabase.from("applications").update({ status }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${id}`);
  return null;
}

// Sends one Resend template email to exactly the applicant this row already
// is -- a lighter, single-recipient sibling of the mass-email tool
// (app/admin/applications/mass-email/actions.ts) for "just email this one
// person" from their detail page, without navigating away to build a filter.
// The email/name come from the application row itself (trusted, already
// staff/admin-gated), not from client input, so there's no pool to
// recompute the way mass-email's sendMassEmail has to.
export async function sendApplicantEmail(
  applicationId: string,
  templateId: string,
  variables: Record<string, string>
): Promise<{ error: string } | null> {
  const { sessionClaims } = await auth();
  const role = sessionClaims?.user_role as string | undefined;
  if (role !== "staff" && role !== "admin") return { error: "Not authorized." };

  const supabase = createClerkSupabaseClient();
  const { data: application, error: fetchError } = await supabase
    .from("applications")
    .select("email, first_name, last_name")
    .eq("id", applicationId)
    .single();
  if (fetchError || !application) return { error: "Application not found." };

  let template: EmailTemplateDetail;
  try {
    template = await getEmailTemplateDetail(templateId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to load the template." };
  }

  const recipient: MassEmailRecipient = {
    to: application.email,
    firstName: application.first_name,
    lastName: application.last_name,
  };

  try {
    await sendTemplateEmail({
      to: recipient.to,
      templateId,
      variables: resolveRecipientVariables(recipient, template.variables, variables),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to send." };
  }

  return null;
}

// Appends a new entry rather than overwriting a single shared field -- many
// staff/admins can each leave their own note over an application's life
// (see application_reviewer_notes' RLS in
// supabase/migrations/20260814100000_application_reviewer_notes_log.sql).
// Sanitization happens here, server-side, before the row is ever written --
// the client-side editor only constrains what a well-behaved browser
// produces, a modified request could send anything.
export async function addApplicationReviewerNote(
  applicationId: string,
  noteHtml: string
): Promise<{ error: string } | null> {
  const { userId, sessionClaims } = await auth();
  const role = sessionClaims?.user_role as string | undefined;
  if (!userId || (role !== "staff" && role !== "admin")) return { error: "Not authorized." };

  const sanitized = sanitizeReviewerNoteHtml(noteHtml);
  if (isReviewerNoteEmpty(sanitized)) return { error: "Note can't be empty." };

  const supabase = createClerkSupabaseClient();
  const { error } = await supabase.from("application_reviewer_notes").insert({
    application_id: applicationId,
    author_clerk_user_id: userId,
    author_role: role,
    note: sanitized,
  });
  if (error) return { error: error.message };

  revalidatePath(`/admin/applications/${applicationId}`);
  return null;
}

// author_clerk_user_id / deleted-note guards live in the update_reviewer_note
// RPC itself (SECURITY DEFINER, see
// supabase/migrations/20260814180000_reviewer_notes_edit_delete_rpcs.sql),
// not just here -- this role check is an early exit for a nicer error
// message, the RPC is the actual enforcement.
export async function editApplicationReviewerNote(
  noteId: string,
  applicationId: string,
  noteHtml: string
): Promise<{ error: string } | null> {
  const { sessionClaims } = await auth();
  const role = sessionClaims?.user_role as string | undefined;
  if (role !== "staff" && role !== "admin") return { error: "Not authorized." };

  const sanitized = sanitizeReviewerNoteHtml(noteHtml);
  if (isReviewerNoteEmpty(sanitized)) return { error: "Note can't be empty." };

  const supabase = createClerkSupabaseClient();
  const { error } = await supabase.rpc("update_reviewer_note", {
    p_note_id: noteId,
    p_note: sanitized,
  });
  if (error) return { error: mapReviewerNoteRpcError(error.message) };

  revalidatePath(`/admin/applications/${applicationId}`);
  return null;
}

// Soft delete via the delete_reviewer_note RPC -- author can delete their
// own note, admin can delete anyone's, enforced inside the RPC itself.
export async function deleteApplicationReviewerNote(
  noteId: string,
  applicationId: string
): Promise<{ error: string } | null> {
  const { sessionClaims } = await auth();
  const role = sessionClaims?.user_role as string | undefined;
  if (role !== "staff" && role !== "admin") return { error: "Not authorized." };

  const supabase = createClerkSupabaseClient();
  const { error } = await supabase.rpc("delete_reviewer_note", { p_note_id: noteId });
  if (error) return { error: mapReviewerNoteRpcError(error.message) };

  revalidatePath(`/admin/applications/${applicationId}`);
  return null;
}

// The RPCs raise plain-text exceptions (see the migration) that PostgREST
// forwards as the error message verbatim -- mapped here to consistent,
// user-facing copy rather than showing raw Postgres exception text.
function mapReviewerNoteRpcError(message: string): string {
  if (message.includes("cannot edit another reviewer")) return "You can only edit your own notes.";
  if (message.includes("not authorized to delete")) return "You can only delete your own notes.";
  if (message.includes("cannot edit a deleted note")) return "This note has already been deleted.";
  if (message.includes("already deleted")) return "This note has already been deleted.";
  if (message.includes("not found")) return "This note no longer exists.";
  if (message.includes("not authorized")) return "Not authorized.";
  return "Something went wrong. Please try again.";
}
