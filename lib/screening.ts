// Fixed, global -- the same teams and same screening questions on every job
// posting. No per-job configuration exists or is planned; nothing in the
// schema or requirements doc suggested per-job variation was needed.

// Team 6 ("Logistics and Operations / AV Production") has no bare entry of
// its own here -- it splits into two sub-tracks, and applicants must pick
// one of those directly, so a bare "team 6" value is never a storable
// preference. Keep in sync with the submit_application RPC's v_valid_teams.
export const TEAMS = [
  "Nonprofit Finances and Legal",
  "Technology and Web Development",
  "Marketing and Press Strategy",
  "Sponsorships and Corporate Partnerships",
  "Speaker Curation and Mentorship",
  "Production",
  "Logistics & Operations",
] as const;

export type Team = (typeof TEAMS)[number];

// The parent title team 6's two sub-tracks split from, and the set of TEAMS
// entries that belong to that split -- so callers (validation, and
// eventually the picker UI) can recognize the pair without hardcoding both
// strings at every call site.
export const TEAM_6_PARENT_TITLE = "Logistics and Operations / AV Production";
export const TEAM_6_SUB_TRACKS: readonly Team[] = ["Production", "Logistics & Operations"];

// The 6 choices shown in the 3 team-ranking dropdowns -- TEAM_6_PARENT_TITLE
// stands in for its two sub-tracks at picker level, since an applicant picks
// "Logistics and Operations / AV Production" once, then resolves it to 6a or
// 6b in a separate required control. Never submit TEAM_6_PARENT_TITLE itself
// as a team preference -- only TEAMS entries are valid to store.
export const TEAM_PICKER_OPTIONS = [
  "Nonprofit Finances and Legal",
  "Technology and Web Development",
  "Marketing and Press Strategy",
  "Sponsorships and Corporate Partnerships",
  "Speaker Curation and Mentorship",
  TEAM_6_PARENT_TITLE,
] as const;

// Shown on the application form word for word, per the org's supplied copy
// -- team leader names are deliberately left out here (the source copy
// included them in parentheses next to each title), everything else is
// verbatim. Order matches TEAM_PICKER_OPTIONS; kept as a separate list
// rather than merged into TEAMS/TEAM_PICKER_OPTIONS since those are
// validation-facing constants, this is display copy.
export type TeamDescription = {
  title: string;
  description: string;
  subTracks?: { title: string; description: string; items?: string[] }[];
};

export const TEAM_DESCRIPTIONS: TeamDescription[] = [
  {
    title: "Nonprofit Finances and Legal",
    description:
      "This team manages the financial backbone and operational integrity of Inspire Columbia. Responsibilities include overseeing annual event budgets, tracking revenue and expenditures, managing grant allocations, and coordinating event contracts with external venues and vendors. Members also ensure compliance with non-profit governance, legal guidelines, and insurance requirements for city-wide operations.",
  },
  {
    title: "Technology and Web Development",
    description:
      "This team builds and maintains the digital infrastructure that powers the organization. Responsibilities include designing UI/UX for the official Inspire Columbia website, managing backend application systems, and supporting technical execution for event platforms.",
  },
  {
    title: "Marketing and Press Strategy",
    description:
      "This team crafts the public voice of Inspire Columbia and drives attendee engagement across the city. Responsibilities include managing press releases, coordinating with local news outlets, developing media strategies, and overseeing promotional campaigns across digital channels.",
  },
  {
    title: "Sponsorships and Corporate Partnerships",
    description:
      "This team generates the capital and community partnerships that make our events possible. Responsibilities include identifying potential corporate sponsors, pitching local businesses, securing grants, and maintaining long-term relationships with regional partners.",
  },
  {
    title: "Speaker Curation and Mentorship",
    description:
      "This team is the heart of the event because without compelling speakers, meaningful ideas, and strong talks, there's ultimately nothing to put on the stage. Curation shapes the core content and intellectual vision of our events, most notably our TEDx events, and has a direct role in determining what our audience experiences and remembers. Responsibilities include scouting and interviewing compelling speakers, vetting and refining talk proposals, building mentorship panels, hosting speaker training and speech-review sessions, coaching speakers through stage preparation and rehearsals, and cross-checking presentations against TEDx and organizational guidelines.",
  },
  {
    title: TEAM_6_PARENT_TITLE,
    description:
      "This team brings our events to life by managing the physical, logistical, and production details behind each experience. Responsibilities include event setup and breakdown, vendor and venue coordination, decorations and space design, AV and lighting production, crowd management, equipment management, and day-of event management.",
    subTracks: [
      {
        title: "Production",
        description:
          "Handling Audio, Lighting, Rigging, Broadcasting of live events, works with our production team day of event and day before event.",
      },
      {
        title: "Logistics & Operations",
        description: "Select and book 3rd party vendors for:",
        items: ["Venue", "Food", "Stage building / Design", "TEDx Sign building", "Decorations/Ambiance", "Ticketing"],
      },
    ],
  },
];

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

// The fixed, exhaustive list of Columbia-area schools accepted as a valid
// college -- no free-typed "Other" fallback anymore, both here and in
// submit_application's validation. Keep in sync with the keys of
// SCHOOL_EMAIL_DOMAINS below (every allowed school has a known domain).
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

export const YEAR_OF_STUDY_OPTIONS = [
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
  "2 Year Master, 1st year",
  "2 Year Master, 2nd year",
  "PhD Candidate",
];

// Pure function backing the 3 team-ranking dropdowns' live exclusion of
// already-picked teams (each dropdown's option list narrows as prior ones
// are chosen) -- kept standalone so it's unit-testable without React.
// Operates on TEAM_PICKER_OPTIONS (picker-level choices), not TEAMS
// (storable values), since a dropdown item is "Logistics and Operations /
// AV Production", never a bare "Production" or "Logistics & Operations".
export function availableTeams(picked: (string | null | undefined)[]): string[] {
  return TEAM_PICKER_OPTIONS.filter((team) => !picked.includes(team));
}
