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
