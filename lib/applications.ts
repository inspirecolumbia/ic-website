import type { Database } from "./database.types";
import { SCHOOL_EMAIL_DOMAINS, SCHOOLS, TEAMS } from "./screening";

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
    createdAt: row.created_at,
  };
}

const statusLabels: Record<ApplicationStatus, string> = {
  submitted: "Submitted",
  still_in_consideration: "Still in Consideration",
  round_1: "Round 1",
  round_2: "Round 2",
  offer: "Offer",
  rejected: "Rejected",
};

export function applicationStatusLabel(status: ApplicationStatus): string {
  return statusLabels[status];
}

export const APPLICATION_STATUSES = Object.keys(statusLabels) as ApplicationStatus[];

// Only ever called with small positive ranks (1-3 team preferences), so no
// need to handle the 11th/12th/13th "always -th" exception a general-
// purpose ordinal formatter would need.
export function ordinal(rank: number): string {
  const suffix = rank === 1 ? "st" : rank === 2 ? "nd" : rank === 3 ? "rd" : "th";
  return `${rank}${suffix}`;
}

// The list view joins in the job title in-memory (the applications table
// only stores job_id), so this is what app/admin/applications/page.tsx
// hands down to ApplicationsManager instead of a bare Application.
export type ApplicationListRow = Application & { jobTitle: string };

// `field` matches the form field's `data-field`/`id`/`name` attribute in
// JobApplicationForm.tsx, when the error is about one specific field --
// lets the client scroll to and flag that exact field instead of just a
// generic top-of-form banner (see lib/hooks/useServerFormError.ts). Left
// undefined for errors that aren't about one field (e.g. a whole-application
// duplicate), which falls back to the banner-only behavior.
export class ApplicationValidationError extends Error {
  field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.field = field;
  }
}

// Exported so tests/unit/business-rule-sync.test.ts can assert these stay in
// sync with the hand-copied regexes in the submit_application RPC.
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Requires an actual 10-digit US number (11 with a leading 1), not just an
// allowed character set -- the previous version (`/^[0-9+()\-.\s]{7,20}$/`)
// had no digit-count requirement at all, so a string of nothing but dashes
// or dots passed as a "valid" phone number. Still accepts common formats:
// plain digits, dashes, dots, spaces, and parens around the area code.
export const PHONE_PATTERN = /^(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;

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
  phone: string;
  schoolEmail: string;
  school: string;
  major: string;
  yearOfStudy: string;
  gpa?: number;
  documents: ApplicationDocumentInput[];
  teamPreferences: { teamName: string; rank: number }[];
  // The raw team_choice_1/2/3 slots as submitted, blanks included --
  // lets the checks below point a validation error at the exact
  // team_choice_N field that's actually wrong (blank, duplicate, or
  // invalid) instead of always blaming the first choice. Optional so
  // fixtures that construct teamPreferences directly (bypassing form
  // submission, e.g. unit tests) don't need to supply it; those fall back
  // to the pre-existing "always team_choice_1" behavior.
  teamSlots?: { field: string; teamName: string }[];
  screeningAnswers: { question: string; answer: string }[];
};

// The generated Args type marks every param as required/non-null since none
// of the SQL function's parameters have a DEFAULT -- but p_gpa is genuinely
// optional at the app layer and gets passed through as an explicit SQL null,
// which Postgres accepts fine even though the generator doesn't reflect it
// in the TS type. p_phone is required now (see PHONE_PATTERN check below),
// so it needs no such override.
export type SubmitApplicationArgs = Omit<
  Database["public"]["Functions"]["submit_application"]["Args"],
  "p_gpa"
> & {
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

  if (!firstName) throw new ApplicationValidationError("First name is required.", "first_name");
  if (!lastName) throw new ApplicationValidationError("Last name is required.", "last_name");
  if (!EMAIL_PATTERN.test(email)) throw new ApplicationValidationError("A valid email is required.", "email");
  if (!EMAIL_PATTERN.test(schoolEmail)) {
    throw new ApplicationValidationError("A valid school email is required.", "school_email");
  }
  if (!major) throw new ApplicationValidationError("Major is required.", "major");
  if (!yearOfStudy) throw new ApplicationValidationError("Year of study is required.", "year_of_study");

  // No free-typed "Other" school anymore -- school must be one of the fixed
  // SCHOOLS list, so it always has a known domain to validate against below.
  if (!SCHOOLS.includes(school)) {
    throw new ApplicationValidationError("Please select a valid school.", "school");
  }

  const allowedSchoolEmailDomains = SCHOOL_EMAIL_DOMAINS[school];
  const schoolEmailDomain = schoolEmail.split("@")[1] ?? "";
  if (!allowedSchoolEmailDomains.includes(schoolEmailDomain)) {
    throw new ApplicationValidationError(
      `School email must be a ${school} address (e.g. name@${allowedSchoolEmailDomains[0]}).`,
      "school_email"
    );
  }

  const resume = input.documents.find((doc) => doc.documentType === "resume");
  const transcript = input.documents.find((doc) => doc.documentType === "transcript");
  if (!resume?.storagePath) throw new ApplicationValidationError("A resume upload is required.", "resume");
  if (!transcript?.storagePath) {
    throw new ApplicationValidationError("An unofficial transcript upload is required.", "transcript");
  }

  if (input.gpa !== undefined && (Number.isNaN(input.gpa) || input.gpa < 0 || input.gpa > 4)) {
    throw new ApplicationValidationError("GPA must be a number between 0 and 4.", "gpa");
  }

  const phone = input.phone.trim();
  if (!phone) throw new ApplicationValidationError("Phone number is required.", "phone");
  if (!PHONE_PATTERN.test(phone)) {
    throw new ApplicationValidationError("Please enter a valid phone number.", "phone");
  }

  const teamErrorField = (predicate: (teamName: string) => boolean): string =>
    input.teamSlots?.find((slot) => predicate(slot.teamName))?.field ?? "team_choice_1";

  // Some job forms (e.g. the general application, which has no Team
  // preferences section) never submit any team choices at all -- 0 is as
  // valid as a complete set of 3. Anything in between is a partially filled
  // section on a form that does have it, still an error.
  if (input.teamPreferences.length !== 0 && input.teamPreferences.length !== 3) {
    throw new ApplicationValidationError(
      "Please select 3 team preferences.",
      teamErrorField((teamName) => !teamName)
    );
  }
  const teamNames = input.teamPreferences.map((pref) => pref.teamName);
  if (new Set(teamNames).size !== teamNames.length) {
    const seen = new Set<string>();
    throw new ApplicationValidationError(
      "Team preferences must be 3 distinct teams.",
      teamErrorField((teamName) => {
        if (seen.has(teamName)) return true;
        seen.add(teamName);
        return false;
      })
    );
  }
  if (teamNames.some((teamName) => !TEAMS.includes(teamName as (typeof TEAMS)[number]))) {
    throw new ApplicationValidationError(
      "Invalid team selection.",
      teamErrorField((teamName) => Boolean(teamName) && !TEAMS.includes(teamName as (typeof TEAMS)[number]))
    );
  }

  return {
    p_application_id: input.applicationId,
    p_job_id: input.jobId,
    p_first_name: firstName,
    p_last_name: lastName,
    p_email: email,
    p_phone: phone,
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
