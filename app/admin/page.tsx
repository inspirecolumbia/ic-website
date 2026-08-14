import Link from "next/link";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClerkSupabaseClient } from "@/lib/supabase/clerk";
import { getDisplayStatus } from "@/lib/jobs";
import { actionLabels, formatDateTime, resolveActorName, resolveJobTitle } from "@/lib/history";

export default async function AdminDashboardPage() {
  const supabase = createClerkSupabaseClient();

  const [{ data: jobs }, { data: recentChanges }, { count: totalApplicants }, { count: newApplicants }] =
    await Promise.all([
      supabase.from("jobs").select("id, title, status, posting_date, closing_date"),
      supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(5),
      supabase.from("applications").select("*", { count: "exact", head: true }),
      // "New" means not yet reviewed -- the status an application starts in
      // and stays in until a staff member first looks at it, not a
      // time-window count (which "since when" would be ambiguous about).
      supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "submitted"),
    ]);
  const jobTitleByJobId = new Map((jobs ?? []).map((job) => [job.id, job.title]));

  const counts = { draft: 0, published: 0, scheduled: 0, closedOrArchived: 0 };
  for (const job of jobs ?? []) {
    const status = getDisplayStatus(job);
    if (status === "closed" || status === "archived" || status === "expired") counts.closedOrArchived++;
    else counts[status]++;
  }

  const actorIds = [...new Set((recentChanges ?? []).map((e) => e.actor_clerk_user_id))];
  const actorNames = new Map<string, string>();
  if (actorIds.length) {
    const client = await clerkClient();
    const actors = (await client.users.getUserList({ userId: actorIds })).data;
    for (const u of actors) {
      actorNames.set(u.id, u.fullName || u.primaryEmailAddress?.emailAddress || u.id);
    }
  }

  const { sessionClaims } = await auth();
  const role = sessionClaims?.user_role as string | undefined;

  const summaryCards: { label: string; value: number; href: string }[] = [
    { label: "Published jobs", value: counts.published, href: "/admin/jobs?status=published" },
    { label: "Scheduled jobs", value: counts.scheduled, href: "/admin/jobs?status=scheduled" },
    { label: "Total applicants", value: totalApplicants ?? 0, href: "/admin/applications" },
    { label: "New applicants", value: newApplicants ?? 0, href: "/admin/applications?status=submitted" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold [font-family:var(--font-serif)]">Dashboard</h1>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 no-underline outline-none transition-colors hover:bg-[var(--admin-surface-hover)] hover:border-[var(--admin-border-strong)] focus-visible:ring-2 focus-visible:ring-[var(--admin-brand)]"
          >
            <p className="m-0 text-sm text-[var(--admin-text-muted)]">{card.label}</p>
            <p className="m-0 mt-1 text-2xl font-semibold text-[var(--admin-text)]">{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
          <p className="m-0 font-medium text-[var(--admin-text)]">Jobs</p>
          <p className="m-0 mt-1 mb-3 text-sm text-[var(--admin-text-muted)]">
            Create, edit, and publish job postings. Also includes change history.
          </p>
          <Link
            href="/admin/jobs"
            className="inline-flex items-center rounded-md bg-[var(--admin-brand)] px-3 py-1.5 text-sm font-medium text-white no-underline outline-none hover:bg-[var(--admin-brand-hover)] focus-visible:ring-2 focus-visible:ring-[var(--admin-brand)]"
          >
            Manage jobs
          </Link>
        </div>

        <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
          <p className="m-0 mb-2 font-medium text-[var(--admin-text)]">Recent changes</p>
          {recentChanges && recentChanges.length > 0 ? (
            <ul className="m-0 flex flex-col gap-2 p-0 text-sm">
              {recentChanges.map((entry) => (
                <li key={entry.id} className="list-none">
                  <Link
                    href="/admin/history"
                    className="flex items-center justify-between gap-2 rounded-md p-1 -m-1 text-inherit no-underline outline-none hover:bg-[var(--admin-surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--admin-brand)]"
                  >
                    <span className="truncate text-[var(--admin-text)]">
                      {actionLabels[entry.action] ?? entry.action} {resolveJobTitle(entry, jobTitleByJobId)}
                    </span>
                    <span className="flex shrink-0 flex-col items-end text-xs text-[var(--admin-text-muted)]">
                      <span>{resolveActorName(entry.actor_clerk_user_id, actorNames)}</span>
                      <span>{formatDateTime(entry.created_at)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-sm text-[var(--admin-text-muted)]">
              {role === "admin" ? "No changes recorded yet." : "Only admins can view recent changes."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
