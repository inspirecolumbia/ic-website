import { describe, expect, it } from "vitest";
import {
  buildMassEmailRecipients,
  chunkRecipients,
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
  it("overrides first_name/last_name with the applicant's known name", () => {
    const resolved = resolveRecipientVariables(
      { to: "ada@example.com", firstName: "Ada", lastName: "Lovelace" },
      { first_name: "", last_name: "", greeting: "Hello" }
    );
    expect(resolved).toEqual({ first_name: "Ada", last_name: "Lovelace", greeting: "Hello" });
  });

  it("falls back to the global value for a manually-added email with no known name", () => {
    const resolved = resolveRecipientVariables(
      { to: "grace@example.com", firstName: null, lastName: null },
      { first_name: "Applicant", greeting: "Hello" }
    );
    expect(resolved).toEqual({ first_name: "Applicant", greeting: "Hello" });
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
