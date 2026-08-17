import type { Database } from "./database.types";

type AuditLogRow = Database["public"]["Tables"]["audit_log"]["Row"];

export const actionLabels: Record<string, string> = {
  insert: "Created",
  update: "Updated",
  delete: "Deleted",
};

// Inspire Columbia is based in Columbia, SC -- every admin timestamp
// (jobs, applications, reviewer notes) renders in America/New_York
// regardless of the viewer's own device or a Vercel function's UTC clock,
// rather than leaving it to whatever timezone happens to render it.
export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).format(new Date(iso));
}

// The audit trigger writes the literal sentinel 'unknown' (not null) for
// actor_clerk_user_id when a jobs mutation happens outside an authenticated
// Clerk session -- today that's only the associate-2026 seed migration, not
// a mystery user. A real Clerk id that Clerk's own user list no longer
// resolves (e.g. a deleted account) is a distinct, more specific case than
// that sentinel, so it gets its own label rather than a shared "Unknown".
export function resolveActorName(actorClerkUserId: string, actorNames: Map<string, string>): string {
  if (!actorClerkUserId) return "Actor unavailable";
  if (actorClerkUserId === "unknown") return "System";
  return actorNames.get(actorClerkUserId) ?? "Deleted account";
}

// old_data/new_data are full row snapshots at the time of the change, so a
// job posting's own title survives even after the job itself is deleted --
// this never needs to re-query the live jobs table for a "jobs" entry.
//
// Applications-table entries are a different shape entirely -- the redacted
// audit trigger (see supabase/migrations/20260805090100_application_audit_triggers.sql)
// snapshots job_id, not a title, so those rows need an actual jobTitleByJobId
// lookup instead. Before this branch nothing wrote to applications from the
// admin UI, so this path never actually ran; every entry silently fell
// through to "Deleted job" once status/notes edits started happening.
export function resolveJobTitle(
  entry: Pick<AuditLogRow, "table_name" | "new_data" | "old_data">,
  jobTitleByJobId: Map<string, string>
): string {
  if (entry.table_name === "applications") {
    const newData = entry.new_data as { job_id?: string } | null;
    const oldData = entry.old_data as { job_id?: string } | null;
    const jobId = newData?.job_id ?? oldData?.job_id;
    return (jobId && jobTitleByJobId.get(jobId)) || "Deleted job";
  }
  const newData = entry.new_data as { title?: string } | null;
  const oldData = entry.old_data as { title?: string } | null;
  return newData?.title ?? oldData?.title ?? "Deleted job";
}
