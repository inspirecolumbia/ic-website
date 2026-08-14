import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { createClerkSupabaseClient } from "@/lib/supabase/clerk";
import { applicationRowToApplication } from "@/lib/applications";
import AdminTabs from "@/components/admin/AdminTabs";
import ApplicationDetail from "@/components/admin/ApplicationDetail";

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sessionClaims } = await auth();
  const role = sessionClaims?.user_role as string | undefined;
  const canView = role === "staff" || role === "admin";

  if (!canView) {
    return (
      <div>
        <AdminTabs />
        <p className="text-sm text-[var(--admin-text-muted)]">
          Only staff and admins can view applications.
        </p>
      </div>
    );
  }

  const supabase = createClerkSupabaseClient();
  const [{ data: row }, { data: documents }, { data: teamPreferences }, { data: screeningAnswers }, { data: statusHistory }] =
    await Promise.all([
      supabase.from("applications").select("*").eq("id", id).maybeSingle(),
      supabase.from("application_documents").select("*").eq("application_id", id),
      supabase
        .from("application_team_preferences")
        .select("*")
        .eq("application_id", id)
        .order("preference_rank"),
      supabase.from("application_screening_answers").select("*").eq("application_id", id),
      supabase
        .from("application_status_history")
        .select("*")
        .eq("application_id", id)
        .order("created_at"),
    ]);

  if (!row) notFound();

  const { data: job } = await supabase.from("jobs").select("title").eq("id", row.job_id).maybeSingle();

  return (
    <div>
      <AdminTabs />
      <ApplicationDetail
        application={applicationRowToApplication(row)}
        jobTitle={job?.title ?? "Deleted job"}
        documents={documents ?? []}
        teamPreferences={teamPreferences ?? []}
        screeningAnswers={screeningAnswers ?? []}
        statusHistory={statusHistory ?? []}
      />
    </div>
  );
}
