import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as templates from "@/lib/email/templates";
import { applicationConfirmationTemplateVariables, staffAlertEmail } from "@/lib/email/templates";

describe("applicationConfirmationTemplateVariables", () => {
  it("maps to the first_name/last_name variables the Resend dashboard template expects", () => {
    expect(applicationConfirmationTemplateVariables("Ada", "Lovelace")).toEqual({
      first_name: "Ada",
      last_name: "Lovelace",
    });
  });
});

describe("status change notifications", () => {
  // Status changes are internal only -- regression guard against a
  // statusChangeEmail export (or equivalent) ever being reintroduced and
  // wired back into updateApplicationStatus.
  it("exports no status-change email template", () => {
    expect("statusChangeEmail" in templates).toBe(false);
  });

  // Source-level drift guard, not a live integration test: updateApplicationStatus
  // uses Clerk auth() and a real Supabase client, both awkward to mock here.
  // Same reasoning as tests/unit/business-rule-sync.test.ts pinning a
  // hand-copied snapshot instead of executing the real code path -- this
  // fails loudly if a future edit re-wires sendEmail into the status action.
  it("updateApplicationStatus never references sendEmail or a status-change template", () => {
    const source = readFileSync(join(process.cwd(), "app/admin/actions.ts"), "utf-8");
    const start = source.indexOf("export async function updateApplicationStatus");
    expect(start).toBeGreaterThan(-1);
    const nextFn = source.indexOf("\nexport async function", start + 1);
    const body = nextFn === -1 ? source.slice(start) : source.slice(start, nextFn);
    expect(body).not.toMatch(/sendEmail|statusChangeEmail/);
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
