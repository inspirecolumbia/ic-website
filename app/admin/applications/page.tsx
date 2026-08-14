import { auth } from "@clerk/nextjs/server";
import { createClerkSupabaseClient } from "@/lib/supabase/clerk";
import { applicationRowToApplication, type ApplicationListRow } from "@/lib/applications";
import AdminTabs from "@/components/admin/AdminTabs";
import ApplicationsManager from "@/components/admin/ApplicationsManager";

const APPLICATIONS_FETCH_CAP = 100;

export default async function ApplicationsPage() {
  const { sessionClaims } = await auth();
  const role = sessionClaims?.user_role as string | undefined;
  const canView = role === "staff" || role === "admin";

  if (!canView) {
    return (
      <div>
        <AdminTabs role={role} />
        <h1 className="mb-2 text-xl font-semibold [font-family:var(--font-serif)]">Applications</h1>
        <p className="text-sm text-[var(--admin-text-muted)]">
          Only staff and admins can view applications.
        </p>
      </div>
    );
  }

  const supabase = createClerkSupabaseClient();
  const [{ data: jobs }, { data: applications }] = await Promise.all([
    supabase.from("jobs").select("id, title").order("title"),
    supabase
      .from("applications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(APPLICATIONS_FETCH_CAP),
  ]);

  const jobTitles = new Map((jobs ?? []).map((job) => [job.id, job.title]));
  const rows: ApplicationListRow[] = (applications ?? []).map((row) => ({
    ...applicationRowToApplication(row),
    jobTitle: jobTitles.get(row.job_id) ?? "Deleted job",
  }));

  return (
    <div>
      <AdminTabs role={role} />
      <h1 className="mb-6 text-xl font-semibold [font-family:var(--font-serif)]">Applications</h1>
      <ApplicationsManager rows={rows} jobs={jobs ?? []} fetchCap={APPLICATIONS_FETCH_CAP} />
    </div>
  );
}
