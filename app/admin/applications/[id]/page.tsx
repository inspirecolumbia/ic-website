import { notFound } from "next/navigation";
import { auth, clerkClient } from "@clerk/nextjs/server";
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
  const [
    { data: row },
    { data: documents },
    { data: teamPreferences },
    { data: screeningAnswers },
    { data: statusHistory },
    { data: reviewerNotes },
  ] = await Promise.all([
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
    supabase
      .from("application_reviewer_notes")
      .select("*")
      .eq("application_id", id)
      .order("created_at"),
  ]);

  if (!row) notFound();

  const { data: job } = await supabase.from("jobs").select("title, role").eq("id", row.job_id).maybeSingle();

  // Author names aren't stored on the note row itself (same pattern as
  // audit_log's actor resolution in app/admin/history/page.tsx) -- resolved
  // from Clerk at read time instead, so a later display-name change shows
  // up on old notes too.
  const authorIds = [...new Set((reviewerNotes ?? []).map((n) => n.author_clerk_user_id))];
  const client = await clerkClient();
  const authors = authorIds.length ? (await client.users.getUserList({ userId: authorIds })).data : [];
  const authorNames = new Map(
    authors.map((u) => [u.id, u.fullName || u.primaryEmailAddress?.emailAddress || u.id])
  );

  return (
    <div>
      <AdminTabs />
      <ApplicationDetail
        application={applicationRowToApplication(row)}
        jobTitle={job?.title ?? "Deleted job"}
        jobRole={job?.role ?? null}
        documents={documents ?? []}
        teamPreferences={teamPreferences ?? []}
        screeningAnswers={screeningAnswers ?? []}
        statusHistory={statusHistory ?? []}
        reviewerNotes={(reviewerNotes ?? []).map((note) => ({
          id: note.id,
          note: note.note,
          createdAt: note.created_at,
          authorName: authorNames.get(note.author_clerk_user_id) ?? "Deleted account",
          authorRole: note.author_role,
        }))}
      />
    </div>
  );
}
