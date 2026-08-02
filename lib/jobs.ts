import type { Job } from "@/components/JobPosting";
import type { Database } from "./database.types";

type JobRow = Database["public"]["Tables"]["jobs"]["Row"];

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
