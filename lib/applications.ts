import type { Database } from "./database.types";

type ApplicationRow = Database["public"]["Tables"]["applications"]["Row"];
type ApplicationStatus = Database["public"]["Enums"]["application_status"];

export type Application = {
  id: string;
  jobId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  schoolEmail: string | null;
  school: string | null;
  major: string | null;
  yearOfStudy: string | null;
  gpa: number | null;
  status: ApplicationStatus;
  reviewerNotes: string | null;
  createdAt: string;
};

export function applicationRowToApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    jobId: row.job_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    schoolEmail: row.school_email,
    school: row.school,
    major: row.major,
    yearOfStudy: row.year_of_study,
    gpa: row.gpa,
    status: row.status,
    reviewerNotes: row.reviewer_notes,
    createdAt: row.created_at,
  };
}

const statusLabels: Record<ApplicationStatus, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  interviewing: "Interviewing",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export function applicationStatusLabel(status: ApplicationStatus): string {
  return statusLabels[status];
}

export class ApplicationValidationError extends Error {}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+()\-.\s]{7,20}$/;

// The application id has to exist before file upload starts (the storage
// path is derived from it), so it's generated up front by the caller, not
// inside buildApplicationInsertPayload -- unlike the old direct-insert
// design, this same id now has to survive across an upload step that
// happens before the payload is even built.
export function generateApplicationId(): string {
  return crypto.randomUUID();
}

// Shared by the actual Storage upload call and buildApplicationInsertPayload
// below so the two can't independently compute different paths for the same
// document. Deliberately does NOT incorporate the user-supplied original
// filename -- a crafted filename (bypassing the normal file picker via a
// direct POST) containing "/" or ".." could otherwise manipulate the
// storage path. The bucket only allows application/pdf anyway, so a fixed
// name per document type is always correct. The real filename still lives
// in application_documents.file_name for display, just never touches the
// path.
export function buildDocumentStoragePath(
  applicationId: string,
  documentType: "resume" | "transcript"
): string {
  return `applications/${applicationId}/${documentType}.pdf`;
}

export type ApplicationDocumentInput = {
  documentType: "resume" | "transcript";
  fileName: string;
  storagePath: string;
};

export type ApplicationSubmissionInput = {
  applicationId: string;
  jobId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  schoolEmail: string;
  school: string;
  major: string;
  yearOfStudy: string;
  gpa?: number;
  documents: ApplicationDocumentInput[];
  teamPreferences: { teamName: string; rank: number }[];
  screeningAnswers: { question: string; answer: string }[];
};

// The generated Args type marks every param as required/non-null since none
// of the SQL function's parameters have a DEFAULT -- but p_phone and p_gpa
// are genuinely optional at the app layer and get passed through as an
// explicit SQL null, which Postgres accepts fine even though the generator
// doesn't reflect it in the TS type.
export type SubmitApplicationArgs = Omit<
  Database["public"]["Functions"]["submit_application"]["Args"],
  "p_phone" | "p_gpa"
> & {
  p_phone: string | null;
  p_gpa: number | null;
};

// Pure, DB-free. Builds the exact argument object for the submit_application
// RPC call (see supabase/migrations/20260809120400_submit_application_rpc.sql)
// -- the form submits through that one function, not 4 separate table
// inserts, so a dropped connection mid-submission can't leave an orphaned
// applications row with missing children.
export function buildApplicationInsertPayload(input: ApplicationSubmissionInput): SubmitApplicationArgs {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email.trim().toLowerCase();
  const schoolEmail = input.schoolEmail.trim().toLowerCase();
  const school = input.school.trim();
  const major = input.major.trim();
  const yearOfStudy = input.yearOfStudy.trim();

  if (!firstName) throw new ApplicationValidationError("First name is required.");
  if (!lastName) throw new ApplicationValidationError("Last name is required.");
  if (!EMAIL_PATTERN.test(email)) throw new ApplicationValidationError("A valid email is required.");
  if (!EMAIL_PATTERN.test(schoolEmail)) throw new ApplicationValidationError("A valid school email is required.");
  if (!school) throw new ApplicationValidationError("School is required.");
  if (!major) throw new ApplicationValidationError("Major is required.");
  if (!yearOfStudy) throw new ApplicationValidationError("Year of study is required.");

  const resume = input.documents.find((doc) => doc.documentType === "resume");
  const transcript = input.documents.find((doc) => doc.documentType === "transcript");
  if (!resume?.storagePath) throw new ApplicationValidationError("A resume upload is required.");
  if (!transcript?.storagePath) throw new ApplicationValidationError("An unofficial transcript upload is required.");

  if (input.gpa !== undefined && (Number.isNaN(input.gpa) || input.gpa < 0 || input.gpa > 4)) {
    throw new ApplicationValidationError("GPA must be a number between 0 and 4.");
  }

  const phone = input.phone?.trim() || undefined;
  if (phone && !PHONE_PATTERN.test(phone)) {
    throw new ApplicationValidationError("Please enter a valid phone number.");
  }

  return {
    p_application_id: input.applicationId,
    p_job_id: input.jobId,
    p_first_name: firstName,
    p_last_name: lastName,
    p_email: email,
    p_phone: phone ?? null,
    p_school_email: schoolEmail,
    p_school: school,
    p_major: major,
    p_year_of_study: yearOfStudy,
    p_gpa: input.gpa ?? null,
    p_documents: input.documents.map((doc) => ({
      documentType: doc.documentType,
      fileName: doc.fileName,
      storagePath: doc.storagePath,
    })),
    p_team_preferences: input.teamPreferences.map((pref) => ({
      teamName: pref.teamName,
      rank: pref.rank,
    })),
    p_screening_answers: input.screeningAnswers.map((answer) => ({
      question: answer.question,
      answer: answer.answer,
    })),
  };
}
