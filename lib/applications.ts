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

export type ApplicationSubmissionInput = {
  jobId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  teamPreferences: { teamName: string; rank: number }[];
  screeningAnswers: { question: string; answer: string }[];
};

export type ApplicationSubmission = {
  application: Database["public"]["Tables"]["applications"]["Insert"];
  documents: Database["public"]["Tables"]["application_documents"]["Insert"][];
  teamPreferences: Database["public"]["Tables"]["application_team_preferences"]["Insert"][];
  screeningAnswers: Database["public"]["Tables"]["application_screening_answers"]["Insert"][];
};

// Pure, DB-free. Builds the insert payload the (not-yet-built) application
// form branch will send in one batch. The application id is generated here,
// client-side, and shared across every child row -- anon has no SELECT
// grant on `applications`, so there's no way to read back a server-
// generated id to attach child rows to afterward.
export function buildApplicationInsertPayload(input: ApplicationSubmissionInput): ApplicationSubmission {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email.trim().toLowerCase();

  if (!firstName) throw new ApplicationValidationError("First name is required.");
  if (!lastName) throw new ApplicationValidationError("Last name is required.");
  if (!EMAIL_PATTERN.test(email)) throw new ApplicationValidationError("A valid email is required.");

  const applicationId = crypto.randomUUID();

  return {
    application: {
      id: applicationId,
      job_id: input.jobId,
      first_name: firstName,
      last_name: lastName,
      email,
      phone: input.phone?.trim() || null,
    },
    documents: [],
    teamPreferences: input.teamPreferences.map((pref) => ({
      application_id: applicationId,
      team_name: pref.teamName,
      preference_rank: pref.rank,
    })),
    screeningAnswers: input.screeningAnswers.map((answer) => ({
      application_id: applicationId,
      question: answer.question,
      answer: answer.answer,
    })),
  };
}
