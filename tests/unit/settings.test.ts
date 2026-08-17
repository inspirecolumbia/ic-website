import { describe, expect, it } from "vitest";
import { isValidFromAddress } from "@/lib/settings";

describe("isValidFromAddress", () => {
  it("accepts a bare email address", () => {
    expect(isValidFromAddress("hello@inspirecolumbia.org")).toBe(true);
  });

  it("accepts a \"Name <email>\" form", () => {
    expect(isValidFromAddress("Inspire Columbia <hello@inspirecolumbia.org>")).toBe(true);
  });

  it("trims surrounding whitespace", () => {
    expect(isValidFromAddress("  hello@inspirecolumbia.org  ")).toBe(true);
  });

  it("rejects a malformed email", () => {
    expect(isValidFromAddress("not-an-email")).toBe(false);
  });

  it("rejects a malformed email inside angle brackets", () => {
    expect(isValidFromAddress("Inspire Columbia <not-an-email>")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidFromAddress("")).toBe(false);
  });
});
