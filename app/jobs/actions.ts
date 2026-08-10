"use server";

import { createClient } from "@/lib/supabase/public";
import {
  ApplicationValidationError,
  buildApplicationInsertPayload,
  generateApplicationId,
} from "@/lib/applications";
import { ApplicationUploadError, uploadApplicationDocument } from "@/lib/storage";
import { SCREENING_QUESTIONS } from "@/lib/screening";
import type { Database } from "@/lib/database.types";

export type ApplicationFormState = { error: string } | { ok: true } | null;

function splitTeamPreferences(formData: FormData) {
  return ["team_choice_1", "team_choice_2", "team_choice_3"]
    .map((name) => formData.get(name) as string | null)
    .filter((value): value is string => Boolean(value))
    .map((teamName, i) => ({ teamName, rank: i + 1 }));
}

function buildScreeningAnswers(formData: FormData) {
  const answers: { question: string; answer: string }[] = [];
  for (const key of Object.keys(SCREENING_QUESTIONS) as (keyof typeof SCREENING_QUESTIONS)[]) {
    const config = SCREENING_QUESTIONS[key];
    const value = ((formData.get(key) as string | null) ?? "").trim();
    if (!value && !config.required) continue;
    answers.push({ question: config.question, answer: value });
  }
  return answers;
}

// No bot protection (Turnstile) on this form by deliberate choice: low-
// traffic, not yet publicized, and nothing else here depends on it, so it
// can be bolted on later (a widget + a server-side check right here) if
// spam actually becomes a problem, without any other rework.
export async function submitApplication(
  prevState: ApplicationFormState,
  formData: FormData
): Promise<ApplicationFormState> {
  const supabase = createClient();
  const applicationId = generateApplicationId();
  const jobId = formData.get("job_id") as string;

  const resumeFile = formData.get("resume") as File | null;
  const transcriptFile = formData.get("transcript") as File | null;

  if (!resumeFile || resumeFile.size === 0) return { error: "A resume upload is required." };
  if (!transcriptFile || transcriptFile.size === 0) {
    return { error: "An unofficial transcript upload is required." };
  }

  try {
    // Upload before any DB write, so a failed upload never leaves an
    // orphaned applications row referencing nothing. A failure *after* a
    // successful upload (e.g. a later validation error) can leave an
    // orphaned Storage file with no referencing row -- accepted for this
    // branch, no cleanup job in scope.
    const resumeUpload = await uploadApplicationDocument(supabase, applicationId, "resume", resumeFile);
    const transcriptUpload = await uploadApplicationDocument(
      supabase,
      applicationId,
      "transcript",
      transcriptFile
    );

    const gpaRaw = formData.get("gpa") as string | null;

    const payload = buildApplicationInsertPayload({
      applicationId,
      jobId,
      firstName: formData.get("first_name") as string,
      lastName: formData.get("last_name") as string,
      email: formData.get("email") as string,
      phone: (formData.get("phone") as string) || undefined,
      schoolEmail: formData.get("school_email") as string,
      school: formData.get("school") as string,
      major: formData.get("major") as string,
      yearOfStudy: formData.get("year_of_study") as string,
      gpa: gpaRaw ? Number(gpaRaw) : undefined,
      documents: [
        { documentType: "resume", fileName: resumeUpload.fileName, storagePath: resumeUpload.storagePath },
        {
          documentType: "transcript",
          fileName: transcriptUpload.fileName,
          storagePath: transcriptUpload.storagePath,
        },
      ],
      teamPreferences: splitTeamPreferences(formData),
      screeningAnswers: buildScreeningAnswers(formData),
    });

    // The generated Args type marks every param non-null since none of the
    // SQL function's parameters have a DEFAULT -- p_phone/p_gpa are
    // genuinely nullable at runtime (see SubmitApplicationArgs in
    // lib/applications.ts), Postgres accepts the explicit null fine even
    // though the type generator doesn't reflect it.
    const { error } = await supabase.rpc(
      "submit_application",
      payload as Database["public"]["Functions"]["submit_application"]["Args"]
    );

    if (error) {
      // 23505: unique_violation on applications_job_id_email_unique.
      if (error.code === "23505") {
        return {
          error: "You've already submitted an application for this position with this email address.",
        };
      }
      return { error: "Something went wrong submitting your application. Please try again." };
    }

    return { ok: true };
  } catch (err) {
    if (err instanceof ApplicationValidationError || err instanceof ApplicationUploadError) {
      return { error: err.message };
    }
    return { error: "Something went wrong submitting your application. Please try again." };
  }
}
