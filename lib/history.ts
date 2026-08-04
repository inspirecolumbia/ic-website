import type { Database } from "./database.types";

type AuditLogRow = Database["public"]["Tables"]["audit_log"]["Row"];

export const actionLabels: Record<string, string> = {
  insert: "Created",
  update: "Updated",
  delete: "Deleted",
};

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
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

// old_data/new_data are full row snapshots at the time of the change, so the
// job's title survives even after the job itself is deleted -- this never
// needs to re-query the live jobs table.
export function resolveJobTitle(entry: Pick<AuditLogRow, "new_data" | "old_data">): string {
  const newData = entry.new_data as { title?: string } | null;
  const oldData = entry.old_data as { title?: string } | null;
  return newData?.title ?? oldData?.title ?? "Deleted job";
}
