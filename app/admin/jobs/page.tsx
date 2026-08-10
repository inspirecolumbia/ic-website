import { auth } from "@clerk/nextjs/server";
import { createClerkSupabaseClient } from "@/lib/supabase/clerk";
import JobsManager from "@/components/admin/JobsManager";
import AdminTabs from "@/components/admin/AdminTabs";

export default async function AdminJobsPage() {
  const { sessionClaims } = await auth();
  const role = sessionClaims?.user_role as string | undefined;
  const canWrite = role === "staff" || role === "admin";

  const supabase = createClerkSupabaseClient();
  const [{ data: jobs }, { data: templates }] = await Promise.all([
    supabase.from("jobs").select("*").order("display_order"),
    supabase.from("application_templates").select("*").order("name"),
  ]);

  return (
    <div>
      <AdminTabs />
      <JobsManager initialJobs={jobs ?? []} templates={templates ?? []} canWrite={canWrite} />
    </div>
  );
}
