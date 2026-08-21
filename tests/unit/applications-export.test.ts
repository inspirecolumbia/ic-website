import { describe, expect, it } from "vitest";
import { applicationsToExportRows } from "@/lib/applications-export";
import type { ApplicationListRow } from "@/lib/applications";
import { SCREENING_QUESTIONS } from "@/lib/screening";

const baseApp: ApplicationListRow = {
  id: "app-1",
  jobId: "job-1",
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  phone: "8035550100",
  schoolEmail: "ada@email.sc.edu",
  school: "University of South Carolina, Columbia",
  major: "Computer Science",
  yearOfStudy: "Junior",
  gpa: 3.9,
  status: "still_in_consideration",
  createdAt: "2026-08-05T00:00:00.000Z",
  jobTitle: "Associate",
};

describe("applicationsToExportRows", () => {
  it("maps every field to a flat export row", () => {
    const rows = applicationsToExportRows([baseApp], new Map());
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: "Ada Lovelace",
      email: "ada@example.com",
      phone: "8035550100",
      school: "University of South Carolina, Columbia",
      schoolEmail: "ada@email.sc.edu",
      major: "Computer Science",
      yearOfStudy: "Junior",
      gpa: "3.9",
      jobTitle: "Associate",
      status: "Still in Consideration",
    });
  });

  it("puts each screening question's answer in its own column", () => {
    const screeningByApp = new Map([
      [
        "app-1",
        [
          { question: SCREENING_QUESTIONS.livesNearColumbia.question, answer: "Yes" },
          { question: SCREENING_QUESTIONS.authorizedToWork.question, answer: "Yes" },
          { question: SCREENING_QUESTIONS.needsVisaSponsorship.question, answer: "No" },
          { question: SCREENING_QUESTIONS.whatAppeals.question, answer: "The mission." },
        ],
      ],
    ]);
    const rows = applicationsToExportRows([baseApp], screeningByApp);
    expect(rows[0]).toMatchObject({
      livesNearColumbia: "Yes",
      authorizedToWork: "Yes",
      needsVisaSponsorship: "No",
      interestInJoining: "The mission.",
    });
  });

  it("falls back to empty strings for nullable fields", () => {
    const rows = applicationsToExportRows(
      [{ ...baseApp, phone: null, school: null, schoolEmail: null, major: null, yearOfStudy: null, gpa: null }],
      new Map()
    );
    expect(rows[0]).toMatchObject({
      phone: "",
      school: "",
      schoolEmail: "",
      major: "",
      yearOfStudy: "",
      gpa: "",
    });
  });

  it("returns empty strings for screening questions an application has no answer for", () => {
    const rows = applicationsToExportRows([baseApp], new Map());
    expect(rows[0]).toMatchObject({
      livesNearColumbia: "",
      authorizedToWork: "",
      needsVisaSponsorship: "",
      interestInJoining: "",
    });
  });

  it("ignores an answer whose question text doesn't match any known screening question", () => {
    const screeningByApp = new Map([["app-1", [{ question: "Some unrelated question?", answer: "huh" }]]]);
    const rows = applicationsToExportRows([baseApp], screeningByApp);
    expect(rows[0]).toMatchObject({
      livesNearColumbia: "",
      authorizedToWork: "",
      needsVisaSponsorship: "",
      interestInJoining: "",
    });
  });
});
