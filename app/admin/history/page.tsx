import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClerkSupabaseClient } from "@/lib/supabase/clerk";
import { resolveActorName, resolveJobTitle } from "@/lib/history";
import { getHistoryDeleteEnabled } from "@/lib/settings";
import AdminTabs from "@/components/admin/AdminTabs";
import HistoryTable from "@/components/admin/HistoryTable";

export default async function HistoryPage() {
  const { sessionClaims } = await auth();
  const role = sessionClaims?.user_role as string | undefined;
  const isAdmin = role === "admin";

  const supabase = createClerkSupabaseClient();
  const [{ data: entries }, { data: jobs }, historyDeleteEnabled] = await Promise.all([
    supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("jobs").select("id, title"),
    getHistoryDeleteEnabled(),
  ]);
  const jobTitleByJobId = new Map((jobs ?? []).map((job) => [job.id, job.title]));

  const actorIds = [...new Set((entries ?? []).map((e) => e.actor_clerk_user_id))];
  const client = await clerkClient();
  const actors = actorIds.length
    ? (await client.users.getUserList({ userId: actorIds })).data
    : [];
  const actorNames = new Map(
    actors.map((u) => [u.id, u.fullName || u.primaryEmailAddress?.emailAddress || u.id])
  );

  const rows = (entries ?? []).map((entry) => ({
    id: entry.id,
    createdAt: entry.created_at,
    recordType: entry.table_name === "applications" ? ("application" as const) : ("job" as const),
    jobId: entry.record_id,
    jobTitle: resolveJobTitle(entry, jobTitleByJobId),
    action: entry.action,
    actorName: resolveActorName(entry.actor_clerk_user_id, actorNames),
    actorRole: entry.actor_role ?? "—",
    oldData: entry.old_data as Record<string, unknown> | null,
    newData: entry.new_data as Record<string, unknown> | null,
  }));

  return (
    <div>
      <AdminTabs role={role} />
      <h1 className="mb-6 text-xl font-semibold [font-family:var(--font-serif)]">History</h1>
      <HistoryTable rows={rows} isAdmin={isAdmin} deletionEnabled={historyDeleteEnabled} />
    </div>
  );
}
