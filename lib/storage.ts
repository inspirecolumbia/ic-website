import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { buildDocumentStoragePath } from "./applications";

export class ApplicationUploadError extends Error {}

const BUCKET = "application-documents";

// Thin wrapper around a Storage upload -- takes an already-constructed
// client rather than building one itself, so it's testable (the error-
// mapping logic below) without hitting real Storage. Maps Supabase Storage's
// error messages to text that's safe to show an applicant directly.
export async function uploadApplicationDocument(
  supabase: SupabaseClient<Database>,
  applicationId: string,
  documentType: "resume" | "transcript",
  file: File
): Promise<{ storagePath: string; fileName: string }> {
  const storagePath = buildDocumentStoragePath(applicationId, documentType);

  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new ApplicationUploadError(mapStorageError(error.message, documentType));
  }

  return { storagePath, fileName: file.name };
}

export function mapStorageError(message: string, documentType: "resume" | "transcript"): string {
  const label = documentType === "resume" ? "resume" : "transcript";
  const lower = message.toLowerCase();

  if (lower.includes("exceeded") || lower.includes("size")) {
    return `Your ${label} is too large. Please upload a PDF under 5 MB.`;
  }
  if (lower.includes("mime") || lower.includes("type")) {
    return `Your ${label} must be a PDF file.`;
  }
  if (lower.includes("duplicate") || lower.includes("already exists")) {
    return `Something went wrong uploading your ${label}. Please try again.`;
  }
  return `We couldn't upload your ${label}. Please check your connection and try again.`;
}

export class JobPhotoUploadError extends Error {}

const JOB_PHOTOS_BUCKET = "job-photos";

// A fresh, random object name per upload (not a fixed name like
// `cover.webp`) is what makes the safe replace/remove ordering possible
// upstream in app/admin/actions.ts: the new file can be uploaded to its own
// path while the old one is still live, so there's never a moment where a
// job has no working photo reference. Callers are responsible for deleting
// the old path only after confirming the database row itself was updated
// successfully -- see deleteJobPhotoObject below.
export function buildJobPhotoStoragePath(jobId: string): string {
  const id = crypto.randomUUID();
  return `jobs/${jobId}/${id}.webp`;
}

// Upload only -- does not touch any previous photo. The cropper always
// exports WebP (lib/imageCrop.ts), so this never branches on file type.
export async function uploadJobPhoto(
  supabase: SupabaseClient<Database>,
  jobId: string,
  file: File
): Promise<string> {
  const storagePath = buildJobPhotoStoragePath(jobId);
  const { error } = await supabase.storage.from(JOB_PHOTOS_BUCKET).upload(storagePath, file, {
    contentType: "image/webp",
    upsert: false,
  });

  if (error) {
    throw new JobPhotoUploadError(mapJobPhotoStorageError(error.message));
  }

  return storagePath;
}

// Best-effort cleanup, called only after the caller has confirmed it's safe
// (the database no longer references this path, whether because a
// replacement's DB update succeeded or a failed DB update is being rolled
// back). A failure here just leaves an orphaned object in Storage rather
// than losing a live photo reference, so it isn't surfaced as an error to
// the admin.
export async function deleteJobPhotoObject(
  supabase: SupabaseClient<Database>,
  photoPath: string
): Promise<void> {
  await supabase.storage.from(JOB_PHOTOS_BUCKET).remove([photoPath]);
}

// Public bucket, so this is plain string construction, not a network call --
// same URL shape a Supabase client's getPublicUrl() would build, but usable
// from both server code (lib/jobs.ts) and client components (JobPhotoField's
// preview) without needing a Supabase client instance in either.
export function jobPhotoPublicUrl(photoPath: string | null): string | null {
  if (!photoPath) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${JOB_PHOTOS_BUCKET}/${photoPath}`;
}

// Staff/admin have a `select` RLS policy on storage.objects for this
// bucket, which is what createSignedUrl needs to succeed -- an anon or
// member session gets a policy-denial error here instead of a URL.
// storage_path is nullable in the DB (a row can exist with an upload that
// never completed), so callers must handle the null case before calling
// this rather than relying on it to fail gracefully.
export async function createApplicationDocumentSignedUrl(
  supabase: SupabaseClient<Database>,
  storagePath: string,
  expiresInSeconds = 60
): Promise<{ url: string } | { error: string }> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data) {
    return { error: error?.message ?? "Couldn't generate a download link." };
  }
  return { url: data.signedUrl };
}

export function mapJobPhotoStorageError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("exceeded") || lower.includes("size")) {
    return "That photo is too large. Please try a different one.";
  }
  if (lower.includes("mime") || lower.includes("type")) {
    return "Job photos must be a JPEG, PNG, or WebP image.";
  }
  return "We couldn't upload that photo. Please check your connection and try again.";
}
