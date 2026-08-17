import { describe, expect, it } from "vitest";
import {
  buildMassEmailRecipients,
  checkVariableCoverage,
  chunkRecipients,
  isValidScheduledAt,
  parseAdditionalEmails,
  resolveRecipientVariables,
} from "@/lib/mass-email";

describe("parseAdditionalEmails", () => {
  it("splits on commas, semicolons, and newlines", () => {
    const { emails, invalid } = parseAdditionalEmails("a@example.com, b@example.com;\nc@example.com");
    expect(emails).toEqual(["a@example.com", "b@example.com", "c@example.com"]);
    expect(invalid).toEqual([]);
  });

  it("lowercases and trims valid addresses", () => {
    const { emails } = parseAdditionalEmails("  Ada@Example.com  ");
    expect(emails).toEqual(["ada@example.com"]);
  });

  it("reports malformed entries as invalid without dropping the rest", () => {
    const { emails, invalid } = parseAdditionalEmails("good@example.com, not-an-email, also-good@example.com");
    expect(emails).toEqual(["good@example.com", "also-good@example.com"]);
    expect(invalid).toEqual(["not-an-email"]);
  });

  it("returns nothing for blank input", () => {
    expect(parseAdditionalEmails("")).toEqual({ emails: [], invalid: [] });
  });
});

describe("buildMassEmailRecipients", () => {
  it("dedupes applicants and additional emails, preferring the applicant's known name", () => {
    const recipients = buildMassEmailRecipients(
      [{ email: "ada@example.com", firstName: "Ada", lastName: "Lovelace" }],
      ["ada@example.com", "grace@example.com"]
    );
    expect(recipients).toEqual([
      { to: "ada@example.com", firstName: "Ada", lastName: "Lovelace" },
      { to: "grace@example.com", firstName: null, lastName: null },
    ]);
  });

  it("dedupes case-insensitively", () => {
    const recipients = buildMassEmailRecipients(
      [{ email: "Ada@Example.com", firstName: "Ada", lastName: "Lovelace" }],
      ["ada@example.com"]
    );
    expect(recipients).toHaveLength(1);
  });
});

describe("resolveRecipientVariables", () => {
  const variables = [
    { key: "first_name", fallbackValue: null },
    { key: "last_name", fallbackValue: null },
    { key: "greeting", fallbackValue: "Hello" },
    { key: "role", fallbackValue: null },
  ];

  it("uses the applicant's known name for first_name/last_name, overriding any global value", () => {
    const resolved = resolveRecipientVariables(
      { to: "ada@example.com", firstName: "Ada", lastName: "Lovelace" },
      variables,
      { first_name: "Applicant", role: "Associate" }
    );
    expect(resolved).toEqual({ first_name: "Ada", last_name: "Lovelace", role: "Associate" });
  });

  it("falls back to the global value for a manually-added email with no known name", () => {
    const resolved = resolveRecipientVariables(
      { to: "grace@example.com", firstName: null, lastName: null },
      variables,
      { first_name: "Applicant", role: "Associate" }
    );
    expect(resolved).toEqual({ first_name: "Applicant", role: "Associate" });
  });

  it("omits a key with neither an auto value nor a global value, leaving Resend's fallback to apply", () => {
    const resolved = resolveRecipientVariables(
      { to: "grace@example.com", firstName: null, lastName: null },
      variables,
      {}
    );
    expect(resolved).toEqual({});
  });
});

describe("checkVariableCoverage", () => {
  const recipients = [
    { to: "ada@example.com", firstName: "Ada", lastName: "Lovelace" },
    { to: "grace@example.com", firstName: null, lastName: null },
  ];

  it("counts auto-fills for first_name/last_name and reports the rest as missing when unset", () => {
    const coverage = checkVariableCoverage(recipients, [{ key: "first_name", fallbackValue: null }], {});
    expect(coverage).toEqual([{ key: "first_name", autoFillsFor: 1, missingFor: 1 }]);
  });

  it("treats a global value as covering every non-auto-filled recipient", () => {
    const coverage = checkVariableCoverage(recipients, [{ key: "role", fallbackValue: null }], { role: "Associate" });
    expect(coverage).toEqual([{ key: "role", autoFillsFor: 0, missingFor: 0 }]);
  });

  it("treats a template fallback as covering every recipient even with no global value", () => {
    const coverage = checkVariableCoverage(recipients, [{ key: "role", fallbackValue: "Team member" }], {});
    expect(coverage).toEqual([{ key: "role", autoFillsFor: 0, missingFor: 0 }]);
  });

  it("reports missingFor 0 once every recipient is covered by name, global value, or fallback", () => {
    const coverage = checkVariableCoverage(
      recipients,
      [
        { key: "first_name", fallbackValue: null },
        { key: "role", fallbackValue: "Team member" },
      ],
      {}
    );
    expect(coverage).toEqual([
      { key: "first_name", autoFillsFor: 1, missingFor: 1 },
      { key: "role", autoFillsFor: 0, missingFor: 0 },
    ]);
  });
});

describe("chunkRecipients", () => {
  it("splits into chunks no larger than the given size", () => {
    const chunks = chunkRecipients([1, 2, 3, 4, 5], 2);
    expect(chunks).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns a single chunk when under the size", () => {
    expect(chunkRecipients([1, 2], 100)).toEqual([[1, 2]]);
  });
});

describe("isValidScheduledAt", () => {
  const now = new Date("2026-08-16T12:00:00.000Z");

  it("rejects a time in the past", () => {
    expect(isValidScheduledAt("2026-08-16T11:59:00.000Z", now)).toBe(false);
  });

  it("rejects an unparseable date", () => {
    expect(isValidScheduledAt("not-a-date", now)).toBe(false);
  });

  it("accepts a time a few days out", () => {
    expect(isValidScheduledAt("2026-08-20T12:00:00.000Z", now)).toBe(true);
  });

  it("rejects a time more than 30 days out", () => {
    expect(isValidScheduledAt("2026-09-20T12:00:01.000Z", now)).toBe(false);
  });

  it("accepts exactly 30 days out", () => {
    expect(isValidScheduledAt("2026-09-15T12:00:00.000Z", now)).toBe(true);
  });
});
