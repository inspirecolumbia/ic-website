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

// Pure function backing the 3 team-ranking dropdowns' live exclusion of
// already-picked teams (each dropdown's option list narrows as prior ones
// are chosen) -- kept standalone so it's unit-testable without React.
export function availableTeams(picked: (string | null | undefined)[]): string[] {
  return TEAMS.filter((team) => !picked.includes(team));
}
