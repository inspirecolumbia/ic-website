import { describe, expect, it } from "vitest";
import { EMAIL_PATTERN, PHONE_PATTERN } from "@/lib/applications";
import { SCHOOL_EMAIL_DOMAINS, SCHOOLS, SCREENING_QUESTIONS, TEAMS } from "@/lib/screening";

// Static drift-guard, not a live check: the submit_application RPC (see
// supabase/migrations/20260810150000_submit_application_rpc_phone_and_school_email_validation.sql)
// duplicates these business rules in SQL because it's the real trust
// boundary (anon can call it directly, bypassing the Next.js app). A unit
// test can't query the DB, so this pins a hand-copied snapshot of what the
// SQL currently says and fails loudly if lib/screening.ts (or the email/
// phone patterns) ever drift out from under it -- the fix is to update
// *both* sides and refresh the snapshot below, never just one.

// Keep in sync with the RPC's v_valid_teams array.
const SQL_VALID_TEAMS = [
  "Nonprofit Finances and Legal",
  "Technology and Web Development",
  "Marketing and Press Strategy",
  "Sponsorships and Corporate Partnerships",
  "Speaker Curation and Mentorship",
  "6a. Production",
  "6b. Logistics & Operations",
];

// Keep in sync with the RPC's v_yes_no_questions array.
const SQL_YES_NO_QUESTIONS = [
  "Do you currently live in or near Columbia, SC?",
  "Are you authorized to work in the United States?",
  "Would you require visa sponsorship from an employer, now or in the future?",
];

// Keep in sync with the RPC's email regex.
const SQL_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Keep in sync with the RPC's phone regex.
const SQL_PHONE_PATTERN = /^(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;

// Keep in sync with the RPC's v_school_email_domains map.
const SQL_SCHOOL_EMAIL_DOMAINS: Record<string, string[]> = {
  "Allen University": ["allenuniversity.edu"],
  "Benedict College": ["benedict.edu"],
  "Columbia College": ["columbiasc.edu"],
  "Columbia International University": ["ciu.edu"],
  "Midlands Technical College": ["midlandstech.edu"],
  "University of South Carolina, Columbia": ["email.sc.edu", "sc.edu"],
};

describe("TS/SQL business-rule literal sync", () => {
  it("lib/screening.ts's TEAMS matches the RPC's team whitelist", () => {
    expect([...TEAMS]).toEqual(SQL_VALID_TEAMS);
  });

  it("lib/screening.ts's required yes/no question text matches the RPC's whitelist", () => {
    const requiredYesNoQuestions = Object.values(SCREENING_QUESTIONS)
      .filter((q) => q.type === "yes_no" && q.required)
      .map((q) => q.question);
    expect(requiredYesNoQuestions).toEqual(SQL_YES_NO_QUESTIONS);
  });

  it("the RPC's email pattern matches lib/applications.ts's EMAIL_PATTERN", () => {
    expect(SQL_EMAIL_PATTERN.source).toBe(EMAIL_PATTERN.source);
  });

  it("the RPC's phone pattern matches lib/applications.ts's PHONE_PATTERN", () => {
    expect(SQL_PHONE_PATTERN.source).toBe(PHONE_PATTERN.source);
  });

  it("the RPC's school email domain map matches lib/screening.ts's SCHOOL_EMAIL_DOMAINS", () => {
    expect(SCHOOL_EMAIL_DOMAINS).toEqual(SQL_SCHOOL_EMAIL_DOMAINS);
  });

  it("lib/screening.ts's SCHOOLS matches the RPC's college whitelist (SCHOOL_EMAIL_DOMAINS' keys)", () => {
    expect([...SCHOOLS].sort()).toEqual(Object.keys(SQL_SCHOOL_EMAIL_DOMAINS).sort());
  });
});
