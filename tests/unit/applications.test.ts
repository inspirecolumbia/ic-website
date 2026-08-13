import { describe, expect, it } from "vitest";
import {
  applicationRowToApplication,
  applicationStatusLabel,
  buildApplicationInsertPayload,
  buildDocumentStoragePath,
  generateApplicationId,
  ApplicationValidationError,
} from "@/lib/applications";
import type { Database } from "@/lib/database.types";

type ApplicationRow = Database["public"]["Tables"]["applications"]["Row"];
type ApplicationStatus = Database["public"]["Enums"]["application_status"];

const baseInput = {
  applicationId: "11111111-1111-1111-1111-111111111111",
  jobId: "22222222-2222-2222-2222-222222222222",
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  phone: "8035550100",
  schoolEmail: "ada@email.sc.edu",
  school: "University of South Carolina, Columbia",
  major: "Computer Science",
  yearOfStudy: "Junior",
  documents: [
    { documentType: "resume" as const, fileName: "resume.pdf", storagePath: "applications/1/resume-resume.pdf" },
    { documentType: "transcript" as const, fileName: "transcript.pdf", storagePath: "applications/1/transcript-transcript.pdf" },
  ],
  teamPreferences: [
    { teamName: "Nonprofit Finances and Legal", rank: 1 },
    { teamName: "Technology and Web Development", rank: 2 },
    { teamName: "6a. Production", rank: 3 },
  ],
  screeningAnswers: [{ question: "Why join?", answer: "Because." }],
};

describe("applicationRowToApplication", () => {
  it("maps every field from a DB row to the app-facing shape", () => {
    const row: ApplicationRow = {
      id: "app-1",
      job_id: "job-1",
      first_name: "Ada",
      last_name: "Lovelace",
      email: "ada@example.com",
      phone: "555-0100",
      school_email: "ada@school.edu",
      school: "University of South Carolina, Columbia",
      major: "Computer Science",
      year_of_study: "Junior",
      gpa: 3.9,
      status: "under_review",
      reviewer_notes: "Strong candidate",
      created_at: "2026-08-05T00:00:00.000Z",
      updated_at: "2026-08-05T00:00:00.000Z",
    };

    expect(applicationRowToApplication(row)).toEqual({
      id: "app-1",
      jobId: "job-1",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      phone: "555-0100",
      schoolEmail: "ada@school.edu",
      school: "University of South Carolina, Columbia",
      major: "Computer Science",
      yearOfStudy: "Junior",
      gpa: 3.9,
      status: "under_review",
      reviewerNotes: "Strong candidate",
      createdAt: "2026-08-05T00:00:00.000Z",
    });
  });
});

describe("generateApplicationId", () => {
  it("returns a valid UUID", () => {
    expect(generateApplicationId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });
});

describe("buildDocumentStoragePath", () => {
  it("is deterministic for the same (applicationId, documentType)", () => {
    const a = buildDocumentStoragePath("app-1", "resume");
    const b = buildDocumentStoragePath("app-1", "resume");
    expect(a).toBe(b);
  });

  it("differs by document type for the same application", () => {
    const resume = buildDocumentStoragePath("app-1", "resume");
    const transcript = buildDocumentStoragePath("app-1", "transcript");
    expect(resume).not.toBe(transcript);
  });

  it("never incorporates a user-supplied filename, only the fixed document type", () => {
    expect(buildDocumentStoragePath("app-1", "resume")).toBe("applications/app-1/resume.pdf");
  });
});

describe("buildApplicationInsertPayload", () => {
  it("carries the caller-supplied application id through to the RPC args", () => {
    const payload = buildApplicationInsertPayload(baseInput);
    expect(payload.p_application_id).toBe(baseInput.applicationId);
  });

  it("throws ApplicationValidationError on a malformed email", () => {
    expect(() => buildApplicationInsertPayload({ ...baseInput, email: "not-an-email" })).toThrow(
      ApplicationValidationError
    );
  });

  it("throws ApplicationValidationError on a malformed school email", () => {
    expect(() => buildApplicationInsertPayload({ ...baseInput, schoolEmail: "not-an-email" })).toThrow(
      ApplicationValidationError
    );
  });

  it("throws ApplicationValidationError when firstName is missing", () => {
    expect(() => buildApplicationInsertPayload({ ...baseInput, firstName: "  " })).toThrow(
      ApplicationValidationError
    );
  });

  it("throws ApplicationValidationError when lastName is missing", () => {
    expect(() => buildApplicationInsertPayload({ ...baseInput, lastName: "" })).toThrow(
      ApplicationValidationError
    );
  });

  it("throws ApplicationValidationError when school is missing", () => {
    expect(() => buildApplicationInsertPayload({ ...baseInput, school: "" })).toThrow(
      ApplicationValidationError
    );
  });

  it("throws ApplicationValidationError when major is missing", () => {
    expect(() => buildApplicationInsertPayload({ ...baseInput, major: "" })).toThrow(
      ApplicationValidationError
    );
  });

  it("throws ApplicationValidationError when yearOfStudy is missing", () => {
    expect(() => buildApplicationInsertPayload({ ...baseInput, yearOfStudy: "" })).toThrow(
      ApplicationValidationError
    );
  });

  it("throws ApplicationValidationError when resume is missing", () => {
    const documents = baseInput.documents.filter((doc) => doc.documentType !== "resume");
    expect(() => buildApplicationInsertPayload({ ...baseInput, documents })).toThrow(
      ApplicationValidationError
    );
  });

  it("throws ApplicationValidationError when transcript is missing", () => {
    const documents = baseInput.documents.filter((doc) => doc.documentType !== "transcript");
    expect(() => buildApplicationInsertPayload({ ...baseInput, documents })).toThrow(
      ApplicationValidationError
    );
  });

  it("lowercases a mixed-case email in the resulting payload", () => {
    const payload = buildApplicationInsertPayload({ ...baseInput, email: "Ada.Lovelace@Example.COM" });
    expect(payload.p_email).toBe("ada.lovelace@example.com");
  });

  it("defaults gpa to null when omitted", () => {
    const payload = buildApplicationInsertPayload(baseInput);
    expect(payload.p_gpa).toBeNull();
  });

  it("throws ApplicationValidationError when phone is missing", () => {
    expect(() => buildApplicationInsertPayload({ ...baseInput, phone: "" })).toThrow(
      ApplicationValidationError
    );
  });

  it("passes through gpa when provided", () => {
    const payload = buildApplicationInsertPayload({ ...baseInput, gpa: 3.75 });
    expect(payload.p_gpa).toBe(3.75);
  });

  it("throws ApplicationValidationError when gpa is NaN", () => {
    expect(() => buildApplicationInsertPayload({ ...baseInput, gpa: Number("not-a-number") })).toThrow(
      ApplicationValidationError
    );
  });

  it("throws ApplicationValidationError when gpa is below 0", () => {
    expect(() => buildApplicationInsertPayload({ ...baseInput, gpa: -0.5 })).toThrow(
      ApplicationValidationError
    );
  });

  it("throws ApplicationValidationError when gpa is above 4", () => {
    expect(() => buildApplicationInsertPayload({ ...baseInput, gpa: 4.5 })).toThrow(
      ApplicationValidationError
    );
  });

  it("throws ApplicationValidationError on a malformed phone number", () => {
    expect(() => buildApplicationInsertPayload({ ...baseInput, phone: "not a phone number!!" })).toThrow(
      ApplicationValidationError
    );
  });

  it("accepts a well-formed phone number", () => {
    const payload = buildApplicationInsertPayload({ ...baseInput, phone: "+1 (555) 010-0100" });
    expect(payload.p_phone).toBe("+1 (555) 010-0100");
  });

  it("accepts a plain 10-digit phone number with no formatting", () => {
    const payload = buildApplicationInsertPayload({ ...baseInput, phone: "8035550100" });
    expect(payload.p_phone).toBe("8035550100");
  });

  it("throws ApplicationValidationError on a phone number that's only separator characters", () => {
    // Regression: the old pattern only checked allowed characters and
    // length, so a string of nothing but dashes passed as "valid".
    expect(() => buildApplicationInsertPayload({ ...baseInput, phone: "-------" })).toThrow(
      ApplicationValidationError
    );
  });

  it("throws ApplicationValidationError on a phone number with too few digits", () => {
    expect(() => buildApplicationInsertPayload({ ...baseInput, phone: "555-0100" })).toThrow(
      ApplicationValidationError
    );
  });

  it("throws ApplicationValidationError when the school email domain doesn't match the selected school", () => {
    expect(() =>
      buildApplicationInsertPayload({ ...baseInput, schoolEmail: "ada@gmail.com" })
    ).toThrow(ApplicationValidationError);
  });

  it("throws ApplicationValidationError when school is not one of the fixed allowed colleges", () => {
    expect(() =>
      buildApplicationInsertPayload({ ...baseInput, school: "Trident Technical College" })
    ).toThrow(ApplicationValidationError);
  });

  it("throws ApplicationValidationError when fewer than 3 team preferences are given", () => {
    expect(() =>
      buildApplicationInsertPayload({
        ...baseInput,
        teamPreferences: [{ teamName: "Nonprofit Finances and Legal", rank: 1 }],
      })
    ).toThrow(ApplicationValidationError);
  });

  it("throws ApplicationValidationError when a team preference is duplicated", () => {
    expect(() =>
      buildApplicationInsertPayload({
        ...baseInput,
        teamPreferences: [
          { teamName: "Nonprofit Finances and Legal", rank: 1 },
          { teamName: "Nonprofit Finances and Legal", rank: 2 },
          { teamName: "6a. Production", rank: 3 },
        ],
      })
    ).toThrow(ApplicationValidationError);
  });

  it("throws ApplicationValidationError on an invalid team name", () => {
    expect(() =>
      buildApplicationInsertPayload({
        ...baseInput,
        teamPreferences: [
          { teamName: "Nonprofit Finances and Legal", rank: 1 },
          { teamName: "Technology and Web Development", rank: 2 },
          { teamName: "Logistics and Operations / AV Production", rank: 3 },
        ],
      })
    ).toThrow(ApplicationValidationError);
  });

  it("accepts a team 6 sub-track (6a or 6b) as a valid team preference", () => {
    const payload = buildApplicationInsertPayload({
      ...baseInput,
      teamPreferences: [
        { teamName: "Nonprofit Finances and Legal", rank: 1 },
        { teamName: "6b. Logistics & Operations", rank: 2 },
        { teamName: "6a. Production", rank: 3 },
      ],
    });
    expect(payload.p_team_preferences.map((pref) => pref.teamName)).toContain("6b. Logistics & Operations");
  });
});

describe("applicationStatusLabel", () => {
  const statuses: ApplicationStatus[] = [
    "submitted",
    "under_review",
    "interviewing",
    "offer",
    "hired",
    "rejected",
    "withdrawn",
  ];

  it.each(statuses)("returns a non-empty label for %s", (status) => {
    expect(applicationStatusLabel(status)).toBeTruthy();
  });
});
