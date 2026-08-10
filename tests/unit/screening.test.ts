import { describe, expect, it } from "vitest";
import { availableTeams, SCREENING_QUESTIONS, TEAMS } from "@/lib/screening";

describe("TEAMS", () => {
  it("has exactly 6 unique entries", () => {
    expect(TEAMS).toHaveLength(6);
    expect(new Set(TEAMS).size).toBe(6);
  });
});

describe("SCREENING_QUESTIONS", () => {
  it("has the 3 required yes/no keys and 1 optional free-text key", () => {
    const keys = Object.keys(SCREENING_QUESTIONS);
    expect(keys).toEqual(["livesNearColumbia", "authorizedToWork", "needsVisaSponsorship", "whatAppeals"]);

    const requiredCount = Object.values(SCREENING_QUESTIONS).filter((q) => q.required).length;
    expect(requiredCount).toBe(3);

    expect(SCREENING_QUESTIONS.whatAppeals.required).toBe(false);
    expect(SCREENING_QUESTIONS.whatAppeals.type).toBe("free_text");
  });
});

describe("availableTeams", () => {
  it("returns all 6 teams when nothing is picked", () => {
    expect(availableTeams([])).toHaveLength(6);
  });

  it("excludes already-picked teams", () => {
    const result = availableTeams(["Nonprofit Finances and Legal", "Production and Operations"]);
    expect(result).toHaveLength(4);
    expect(result).not.toContain("Nonprofit Finances and Legal");
    expect(result).not.toContain("Production and Operations");
  });

  it("ignores null/undefined entries in the picked list", () => {
    expect(availableTeams([null, undefined, "Production and Operations"])).toHaveLength(5);
  });
});
