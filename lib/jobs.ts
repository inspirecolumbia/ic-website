import type { Job } from "@/components/JobPosting";
import type { Database } from "./database.types";

type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
export type DisplayStatus = "draft" | "published" | "scheduled" | "expired" | "closed" | "archived";

// posting_date/closing_date are full timestamptz instants (staff can
// schedule a specific time, not just a day), so "now" needs to be a full
// instant too -- ISO-with-Z strings still compare correctly with plain `<`/
// `>` since lexicographic order matches chronological order for that format.
const nowIso = () => new Date().toISOString();

// "scheduled" and "expired" are both computed visibility states, not real
// status-column values -- posting_date/closing_date hide a published job
// from the public without ever touching status, no cron job needed (see
// the RLS policy in 20260810140000_jobs_scheduling_timestamptz.sql). Staff
// still see the underlying "published" status; this is what the admin UI
// shows them instead, so they know why a published job isn't publicly
// visible.
export function getDisplayStatus(
  job: Pick<JobRow, "status" | "posting_date" | "closing_date">
): DisplayStatus {
  if (job.status === "published" && job.posting_date && job.posting_date > nowIso()) {
    return "scheduled";
  }
  if (job.status === "published" && job.closing_date && job.closing_date < nowIso()) {
    return "expired";
  }
  return job.status;
}

// Both posting_date and published_at are timestamptz instants -- public
// display deliberately shows only the date, never the scheduled time, so
// this stays a plain date formatter for both.
function formatDate(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// For contexts that can't render Markdown (SEO/OG meta description tags) --
// strips the common syntax and collapses whitespace so a heading like
// "## Responsibilities" doesn't show up literally in a search result.
export function stripMarkdown(markdown: string, maxLength = 160): string {
  const plain = markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > maxLength ? `${plain.slice(0, maxLength - 1).trimEnd()}…` : plain;
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
    ],
    description: row.description,
    applyUrl: row.apply_url,
    postedDate: formatDate(row.posting_date),
    lastPublished: formatDate(row.published_at),
  };
}
