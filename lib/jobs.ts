import type { Job } from "@/components/JobPosting";
import type { Database } from "./database.types";

type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
export type DisplayStatus = "draft" | "published" | "scheduled" | "closed" | "archived";

const todayIso = () => new Date().toISOString().slice(0, 10);

export function getDisplayStatus(job: Pick<JobRow, "status" | "posting_date">): DisplayStatus {
  if (job.status === "published" && job.posting_date && job.posting_date > todayIso()) {
    return "scheduled";
  }
  return job.status;
}

function formatPostingDate(postingDate: string | null): string {
  if (!postingDate) return "";
  return new Date(`${postingDate}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function jobRowToJob(row: JobRow): Job {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    role: row.role,
    location: row.location,
    commitmentType: row.commitment_type,
    postingDate: row.posting_date ?? "",
    quickFacts: [
      { label: "Location", value: row.location },
      { label: "Commitment", value: row.commitment_type },
      { label: "Posted", value: formatPostingDate(row.posting_date) },
      { label: "Program", value: row.role },
    ],
    description: row.description,
    responsibilities: row.responsibilities,
    qualifications: row.qualifications,
    applyUrl: row.apply_url,
  };
}
