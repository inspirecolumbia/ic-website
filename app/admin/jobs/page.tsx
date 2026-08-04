import { auth } from "@clerk/nextjs/server";
import { createClerkSupabaseClient } from "@/lib/supabase/clerk";
import JobsManager from "@/components/admin/JobsManager";
import AdminTabs from "@/components/admin/AdminTabs";

export default async function AdminJobsPage() {
  const { sessionClaims } = await auth();
  const role = sessionClaims?.user_role as string | undefined;
  const canWrite = role === "staff" || role === "admin";

  const supabase = createClerkSupabaseClient();
  const { data: jobs } = await supabase.from("jobs").select("*").order("display_order");

  return (
    <div>
      <AdminTabs />
      <JobsManager initialJobs={jobs ?? []} canWrite={canWrite} />
    </div>
  );
}
