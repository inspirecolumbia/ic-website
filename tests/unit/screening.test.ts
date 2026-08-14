import { describe, expect, it } from "vitest";
import { availableTeams, SCREENING_QUESTIONS, TEAM_PICKER_OPTIONS, TEAMS } from "@/lib/screening";

describe("TEAMS", () => {
  it("has exactly 7 unique entries", () => {
    expect(TEAMS).toHaveLength(7);
    expect(new Set(TEAMS).size).toBe(7);
  });

  it("never includes a bare team 6 value, only its two sub-tracks", () => {
    expect(TEAMS).not.toContain("Logistics and Operations / AV Production");
    expect(TEAMS).toContain("Production");
    expect(TEAMS).toContain("Logistics & Operations");
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

describe("TEAM_PICKER_OPTIONS", () => {
  it("has exactly 6 unique entries, standing in for team 6's two sub-tracks with one parent title", () => {
    expect(TEAM_PICKER_OPTIONS).toHaveLength(6);
    expect(new Set(TEAM_PICKER_OPTIONS).size).toBe(6);
    expect(TEAM_PICKER_OPTIONS).toContain("Logistics and Operations / AV Production");
    expect(TEAM_PICKER_OPTIONS).not.toContain("Production");
    expect(TEAM_PICKER_OPTIONS).not.toContain("Logistics & Operations");
  });
});

describe("availableTeams", () => {
  it("returns all 6 picker options when nothing is picked", () => {
    expect(availableTeams([])).toHaveLength(6);
  });

  it("excludes already-picked teams", () => {
    const result = availableTeams(["Nonprofit Finances and Legal", "Logistics and Operations / AV Production"]);
    expect(result).toHaveLength(4);
    expect(result).not.toContain("Nonprofit Finances and Legal");
    expect(result).not.toContain("Logistics and Operations / AV Production");
  });

  it("ignores null/undefined entries in the picked list", () => {
    expect(availableTeams([null, undefined, "Logistics and Operations / AV Production"])).toHaveLength(5);
  });
});
