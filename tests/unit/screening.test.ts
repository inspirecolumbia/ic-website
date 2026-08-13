import { describe, expect, it } from "vitest";
import { availableTeams, SCREENING_QUESTIONS, TEAMS } from "@/lib/screening";

describe("TEAMS", () => {
  it("has exactly 7 unique entries", () => {
    expect(TEAMS).toHaveLength(7);
    expect(new Set(TEAMS).size).toBe(7);
  });

  it("never includes a bare team 6 value, only its two sub-tracks", () => {
    expect(TEAMS).not.toContain("Logistics and Operations / AV Production");
    expect(TEAMS).toContain("6a. Production");
    expect(TEAMS).toContain("6b. Logistics & Operations");
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
  it("returns all 7 teams when nothing is picked", () => {
    expect(availableTeams([])).toHaveLength(7);
  });

  it("excludes already-picked teams", () => {
    const result = availableTeams(["Nonprofit Finances and Legal", "6a. Production"]);
    expect(result).toHaveLength(5);
    expect(result).not.toContain("Nonprofit Finances and Legal");
    expect(result).not.toContain("6a. Production");
  });

  it("ignores null/undefined entries in the picked list", () => {
    expect(availableTeams([null, undefined, "6a. Production"])).toHaveLength(6);
  });
});
