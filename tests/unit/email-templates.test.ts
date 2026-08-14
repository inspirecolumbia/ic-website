import { describe, expect, it } from "vitest";
import {
  applicationConfirmationTemplateVariables,
  staffAlertEmail,
  statusChangeEmail,
} from "@/lib/email/templates";

describe("applicationConfirmationTemplateVariables", () => {
  it("maps to the first_name/last_name variables the Resend dashboard template expects", () => {
    expect(applicationConfirmationTemplateVariables("Ada", "Lovelace")).toEqual({
      first_name: "Ada",
      last_name: "Lovelace",
    });
  });
});

describe("statusChangeEmail", () => {
  it("includes the human-readable status label, not the raw enum value", () => {
    const email = statusChangeEmail("Ada", "Associate", "under_review");
    expect(email.text).toContain("Under review");
    expect(email.text).not.toContain("under_review");
    expect(email.html).toContain("Under review");
  });

  it("labels every application status without throwing", () => {
    const statuses = [
      "submitted",
      "under_review",
      "interviewing",
      "offer",
      "hired",
      "rejected",
      "withdrawn",
    ] as const;
    for (const status of statuses) {
      expect(() => statusChangeEmail("Ada", "Associate", status)).not.toThrow();
    }
  });
});

describe("staffAlertEmail", () => {
  it("includes the applicant's full name and job title", () => {
    const email = staffAlertEmail("Ada Lovelace", "Associate");
    expect(email.subject).toContain("Ada Lovelace");
    expect(email.subject).toContain("Associate");
    expect(email.text).toContain("Ada Lovelace");
  });
});
