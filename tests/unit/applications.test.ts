import { describe, expect, it } from "vitest";
import {
  applicationRowToApplication,
  applicationStatusLabel,
  ApplicationValidationError,
  buildApplicationInsertPayload,
} from "@/lib/applications";
import type { Database } from "@/lib/database.types";

type ApplicationRow = Database["public"]["Tables"]["applications"]["Row"];
type ApplicationStatus = Database["public"]["Enums"]["application_status"];

const baseInput = {
  jobId: "11111111-1111-1111-1111-111111111111",
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  teamPreferences: [{ teamName: "Programming", rank: 1 }],
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
      status: "under_review",
      reviewerNotes: "Strong candidate",
      createdAt: "2026-08-05T00:00:00.000Z",
    });
  });
});

describe("buildApplicationInsertPayload", () => {
  it("stamps the same generated id on the application and every child row", () => {
    const payload = buildApplicationInsertPayload(baseInput);

    expect(payload.application.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(payload.teamPreferences[0]?.application_id).toBe(payload.application.id);
    expect(payload.screeningAnswers[0]?.application_id).toBe(payload.application.id);
  });

  it("throws ApplicationValidationError on a malformed email", () => {
    expect(() => buildApplicationInsertPayload({ ...baseInput, email: "not-an-email" })).toThrow(
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

  it("lowercases a mixed-case email in the resulting payload", () => {
    const payload = buildApplicationInsertPayload({ ...baseInput, email: "Ada.Lovelace@Example.COM" });
    expect(payload.application.email).toBe("ada.lovelace@example.com");
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
