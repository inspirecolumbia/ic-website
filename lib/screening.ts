// Fixed, global -- the same 6 teams and same screening questions on every
// job posting. No per-job configuration exists or is planned; nothing in
// the schema or requirements doc suggested per-job variation was needed.

export const TEAMS = [
  "Nonprofit Finances and Legal",
  "Technology and Web Development",
  "Marketing and Press Strategy",
  "Sponsorships, Corporate Partnerships, and Fundraising",
  "Speaker Curation and Mentorship",
  "Production and Operations",
] as const;

export type Team = (typeof TEAMS)[number];

// Object, not a flat string array, so the form can render yes/no vs.
// free-text differently without string-matching on question text.
export const SCREENING_QUESTIONS = {
  livesNearColumbia: {
    question: "Do you currently live in or near Columbia, SC?",
    type: "yes_no",
    required: true,
  },
  authorizedToWork: {
    question: "Are you authorized to work in the United States?",
    type: "yes_no",
    required: true,
  },
  needsVisaSponsorship: {
    question: "Would you require visa sponsorship from an employer, now or in the future?",
    type: "yes_no",
    required: true,
  },
  whatAppeals: {
    question: "What appeals to you about joining Inspire Columbia?",
    type: "free_text",
    required: false,
  },
} as const;

export type ScreeningQuestionKey = keyof typeof SCREENING_QUESTIONS;

// The fixed list of Columbia-area schools shown as radio options on the
// application form, plus an "Other" free-text fallback (handled in
// components/JobApplicationForm.tsx, not listed here).
export const SCHOOLS = [
  "Allen University",
  "Benedict College",
  "Columbia College",
  "Columbia International University",
  "Midlands Technical College",
  "University of South Carolina, Columbia",
];

// Verified student-email domains for each school above (2026-08-10). Used
// to reject a school-email/school mismatch (e.g. picking USC but entering a
// gmail.com address) -- skipped entirely for a free-typed "Other" school,
// since there's no known domain to check against. Keep in sync with the
// submit_application RPC's v_school_email_domains.
export const SCHOOL_EMAIL_DOMAINS: Record<string, string[]> = {
  "Allen University": ["allenuniversity.edu"],
  "Benedict College": ["benedict.edu"],
  "Columbia College": ["columbiasc.edu"],
  "Columbia International University": ["ciu.edu"],
  "Midlands Technical College": ["midlandstech.edu"],
  "University of South Carolina, Columbia": ["email.sc.edu", "sc.edu"],
};

export const YEAR_OF_STUDY_OPTIONS = ["Freshman", "Sophomore", "Junior", "Senior", "Alumni"];

// Pure function backing the 3 team-ranking dropdowns' live exclusion of
// already-picked teams (each dropdown's option list narrows as prior ones
// are chosen) -- kept standalone so it's unit-testable without React.
export function availableTeams(picked: (string | null | undefined)[]): string[] {
  return TEAMS.filter((team) => !picked.includes(team));
}
