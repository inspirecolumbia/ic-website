import { describe, expect, it } from "vitest";
import { isPromotableRole, roleLabel, roleRank } from "@/lib/user-roles";

describe("isPromotableRole", () => {
  it("accepts member and staff", () => {
    expect(isPromotableRole("member")).toBe(true);
    expect(isPromotableRole("staff")).toBe(true);
  });

  it("rejects admin -- admin is never settable through this path", () => {
    expect(isPromotableRole("admin")).toBe(false);
  });

  it("rejects arbitrary or malformed values", () => {
    expect(isPromotableRole("")).toBe(false);
    expect(isPromotableRole("superadmin")).toBe(false);
    expect(isPromotableRole("Member")).toBe(false);
  });
});

describe("roleRank", () => {
  it("ranks unassigned lowest and admin highest", () => {
    expect(roleRank(null)).toBeLessThan(roleRank("member"));
    expect(roleRank("member")).toBeLessThan(roleRank("staff"));
    expect(roleRank("staff")).toBeLessThan(roleRank("admin"));
  });

  it("treats an unrecognized role the same as unassigned", () => {
    expect(roleRank("something-else")).toBe(roleRank(null));
  });
});

describe("roleLabel", () => {
  it("labels every known role", () => {
    expect(roleLabel("admin")).toBe("Admin");
    expect(roleLabel("staff")).toBe("Staff");
    expect(roleLabel("member")).toBe("Member");
  });

  it("labels null and unrecognized values as unassigned", () => {
    expect(roleLabel(null)).toBe("No role assigned");
    expect(roleLabel("something-else")).toBe("No role assigned");
  });
});
