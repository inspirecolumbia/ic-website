import { describe, expect, it } from "vitest";
import { applicationsToExportRows } from "@/lib/applications-export";
import type { ApplicationListRow } from "@/lib/applications";

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
  status: "under_review",
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
      status: "Under review",
    });
  });

  it("joins multiple screening answers into one newline-separated column", () => {
    const screeningByApp = new Map([
      [
        "app-1",
        [
          { question: "Why join?", answer: "Because." },
          { question: "Available hours?", answer: "10/week" },
        ],
      ],
    ]);
    const rows = applicationsToExportRows([baseApp], screeningByApp);
    expect(rows[0].screeningAnswers).toBe("Why join?: Because.\nAvailable hours?: 10/week");
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

  it("returns an empty screening answers column when an application has none", () => {
    const rows = applicationsToExportRows([baseApp], new Map());
    expect(rows[0].screeningAnswers).toBe("");
  });
});
