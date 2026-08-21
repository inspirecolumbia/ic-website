import { describe, expect, it } from "vitest";
import { resolveJobTitle } from "@/lib/history";

describe("resolveJobTitle", () => {
  it("reads a job posting entry's title directly from new_data", () => {
    const entry = { table_name: "jobs", new_data: { title: "Associate" }, old_data: null };
    expect(resolveJobTitle(entry, new Map())).toBe("Associate");
  });

  it("falls back to old_data's title for a deleted job posting", () => {
    const entry = { table_name: "jobs", new_data: null, old_data: { title: "Associate" } };
    expect(resolveJobTitle(entry, new Map())).toBe("Associate");
  });

  it("resolves an application entry's job title via job_id, not a nonexistent title field", () => {
    const entry = { table_name: "applications", new_data: { job_id: "job-1", status: "still_in_consideration" }, old_data: null };
    const jobTitleByJobId = new Map([["job-1", "Associate"]]);
    expect(resolveJobTitle(entry, jobTitleByJobId)).toBe("Associate");
  });

  it("falls back to old_data's job_id for a deleted application entry", () => {
    const entry = { table_name: "applications", new_data: null, old_data: { job_id: "job-1" } };
    const jobTitleByJobId = new Map([["job-1", "Associate"]]);
    expect(resolveJobTitle(entry, jobTitleByJobId)).toBe("Associate");
  });

  it("returns Deleted job for an application entry whose job_id isn't in the map", () => {
    const entry = { table_name: "applications", new_data: { job_id: "gone" }, old_data: null };
    expect(resolveJobTitle(entry, new Map())).toBe("Deleted job");
  });
});
