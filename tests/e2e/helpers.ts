import type { Page } from "@playwright/test";
import { Pool } from "pg";
import {
  SCHOOL_EMAIL_DOMAINS,
  SCREENING_QUESTIONS,
  TEAM_6_PARENT_TITLE,
  TEAM_6_SUB_TRACKS,
} from "@/lib/screening";

// Same local-stack connection string tests/rls/helpers/db.ts uses -- direct
// Postgres access to verify what actually got persisted, since the app
// itself never lets a browser read applications back (anon can insert-only).
export const pool = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres" });

export const JOB_SLUG = "associate-2026";

export const SCHOOL = "University of South Carolina, Columbia";
const SCHOOL_EMAIL_DOMAIN = SCHOOL_EMAIL_DOMAINS[SCHOOL][0];

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export function schoolEmailFor(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@${SCHOOL_EMAIL_DOMAIN}`;
}

type FileInput = { name: string; mimeType: string; buffer: Buffer };

// A real render-able PDF isn't necessary -- the application-documents
// Storage bucket enforces file_size_limit/allowed_mime_types off the
// upload's declared size and content-type, not deep byte inspection (see
// supabase/migrations/20260809120300_create_application_documents_bucket.sql).
export const VALID_PDF: FileInput = {
  name: "resume.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4\n%%EOF"),
};

// Bucket's file_size_limit is 5242880 bytes (5 MiB) -- one byte over it.
export const OVERSIZED_PDF: FileInput = {
  name: "resume.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.alloc(5 * 1024 * 1024 + 1, 0),
};

// Correct extension, wrong declared MIME type -- the bucket's
// allowed_mime_types is ['application/pdf'], so this should be rejected the
// same way a genuinely non-PDF file would be.
export const WRONG_TYPE_FILE: FileInput = {
  name: "resume.pdf",
  mimeType: "text/plain",
  buffer: Buffer.from("not actually a pdf"),
};

export type FillOptions = {
  firstName?: string;
  lastName?: string;
  email?: string;
  schoolEmail?: string;
  phone?: string;
  school?: string;
  yearOfStudy?: string;
  major?: string;
  gpa?: string;
  /** Picker-level labels (e.g. TEAM_6_PARENT_TITLE for team 6). Fewer than
   * 3 entries deliberately leaves the remaining dropdown(s) unset, for
   * testing the "exactly 3 required" validation. */
  teamChoices?: string[];
  /** Only used when one of teamChoices is TEAM_6_PARENT_TITLE. Pass null to
   * deliberately leave the sub-track unset (for testing that it's
   * required). Defaults to the first sub-track when omitted entirely. */
  subTrack?: string | null;
  resumeFile?: FileInput | null;
  transcriptFile?: FileInput | null;
};

// RadioWithOther's radio buttons (school, year of study, team 6's
// sub-track) render as a base-ui `role="radio"` <span> that's the real
// interactive element, alongside a visually-hidden native <input> kept only
// as a form-participation shim -- and the <label for=...> in this codebase
// points at that hidden input's id, not the visible span, so
// page.getByLabel() resolves to an element Playwright correctly refuses to
// click (it's clipped to 1px and never meant to be interacted with
// directly). Locate the visible radio within its label's text instead.
// Exported (not just used internally for clicking) so tests can also assert
// on checked state via this same, correct element -- asserting against
// page.getByLabel(...) instead would silently check the hidden shim input,
// which isn't reliably kept in sync, rather than the real one.
export function radioOption(page: Page, optionText: string) {
  return page.locator("label", { hasText: optionText }).locator('[role="radio"]');
}

async function clickRadioOption(page: Page, optionText: string): Promise<void> {
  await radioOption(page, optionText).click();
}

// Same underlying issue as radioOption, but "Yes"/"No" text isn't unique
// across the 3 eligibility questions, so this scopes to the question's own
// container (the label's parent div) first.
export function eligibilityRadioOption(page: Page, questionText: string, answer: "Yes" | "No") {
  const container = page.getByText(questionText, { exact: false }).locator("xpath=..");
  return container.locator("label", { hasText: answer }).locator('[role="radio"]');
}

async function clickEligibilityAnswer(page: Page, questionText: string, answer: "Yes" | "No"): Promise<void> {
  await eligibilityRadioOption(page, questionText, answer).click();
}

const DEFAULT_TEAM_CHOICES: string[] = [
  "Nonprofit Finances and Legal",
  "Technology and Web Development",
  "Marketing and Press Strategy",
];

// Fills every field of the application form to a valid state (or to
// whatever overrides are given), without submitting. Callers submit
// themselves so each test can assert on the pre-submit DOM state too.
export async function fillApplicationForm(page: Page, opts: FillOptions = {}): Promise<{ email: string }> {
  const email = opts.email ?? uniqueEmail("ada");

  await page.locator("#first_name").fill(opts.firstName ?? "Ada");
  await page.locator("#last_name").fill(opts.lastName ?? "Lovelace");
  await page.locator("#email").fill(email);
  await page.locator("#school_email").fill(opts.schoolEmail ?? schoolEmailFor("ada"));
  await page.locator("#phone").fill(opts.phone ?? "8035550100");

  await clickRadioOption(page, opts.school ?? SCHOOL);
  await clickRadioOption(page, opts.yearOfStudy ?? "Junior");

  await page.locator("#major").fill(opts.major ?? "Computer Science");
  if (opts.gpa !== undefined) {
    await page.locator("#gpa").fill(opts.gpa);
  }

  if (opts.resumeFile !== null) {
    await page.locator("#resume").setInputFiles(opts.resumeFile ?? VALID_PDF);
  }
  if (opts.transcriptFile !== null) {
    await page.locator("#transcript").setInputFiles(opts.transcriptFile ?? VALID_PDF);
  }

  const teamChoices = opts.teamChoices ?? DEFAULT_TEAM_CHOICES;
  const triggerIds = ["team_choice_1", "team_choice_2", "team_choice_3"];
  for (let i = 0; i < teamChoices.length; i++) {
    await page.locator(`#${triggerIds[i]}`).click();
    await page.getByRole("option", { name: teamChoices[i], exact: true }).click();
    if (teamChoices[i] === TEAM_6_PARENT_TITLE && opts.subTrack !== null) {
      await clickRadioOption(page, opts.subTrack ?? TEAM_6_SUB_TRACKS[0]);
    }
  }

  await clickEligibilityAnswer(page, SCREENING_QUESTIONS.livesNearColumbia.question, "Yes");
  await clickEligibilityAnswer(page, SCREENING_QUESTIONS.authorizedToWork.question, "Yes");
  await clickEligibilityAnswer(page, SCREENING_QUESTIONS.needsVisaSponsorship.question, "No");

  return { email };
}

export async function submit(page: Page): Promise<void> {
  await page.getByRole("button", { name: /submit application/i }).click();
}

export async function teamPreferencesFor(email: string): Promise<string[]> {
  const { rows } = await pool.query(
    `select tp.team_name
     from application_team_preferences tp
     join applications a on a.id = tp.application_id
     where lower(a.email) = lower($1)
     order by tp.preference_rank`,
    [email]
  );
  return rows.map((r) => r.team_name as string);
}
