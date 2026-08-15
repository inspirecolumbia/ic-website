import { notFound } from "next/navigation";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClerkSupabaseClient } from "@/lib/supabase/clerk";
import { applicationRowToApplication } from "@/lib/applications";
import AdminTabs from "@/components/admin/AdminTabs";
import ApplicationDetail from "@/components/admin/ApplicationDetail";

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, sessionClaims } = await auth();
  const role = sessionClaims?.user_role as string | undefined;
  const canView = role === "staff" || role === "admin";

  if (!canView) {
    // Doesn't distinguish a real application id from a fake one -- a
    // member gets the same message either way, so this route can't be
    // used to probe whether an id exists.
    return (
      <div>
        <AdminTabs role={role} />
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
    // Reads go through this RPC, not a direct select -- it's the only path
    // that redacts a soft-deleted note's content and never returns who
    // deleted it (see supabase/migrations/20260814180000_reviewer_notes_edit_delete_rpcs.sql).
    // Direct SELECT on the table is revoked for authenticated entirely.
    supabase.rpc("list_reviewer_notes", { p_application_id: id }),
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
      <AdminTabs role={role} />
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
          isDeleted: note.is_deleted,
          createdAt: note.created_at,
          updatedAt: note.updated_at,
          deletedAt: note.deleted_at,
          authorClerkUserId: note.author_clerk_user_id,
          authorName: authorNames.get(note.author_clerk_user_id) ?? "Deleted account",
        }))}
        currentUserId={userId}
        currentUserRole={role as "staff" | "admin"}
      />
    </div>
  );
}
