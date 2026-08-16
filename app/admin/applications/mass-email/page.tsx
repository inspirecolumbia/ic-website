import { auth } from "@clerk/nextjs/server";
import { createClerkSupabaseClient } from "@/lib/supabase/clerk";
import AdminTabs from "@/components/admin/AdminTabs";
import MassEmailComposer from "@/components/admin/MassEmailComposer";
import { listPublishedEmailTemplates } from "@/lib/email/send";

export default async function MassEmailPage() {
  const { sessionClaims } = await auth();
  const role = sessionClaims?.user_role as string | undefined;
  const canView = role === "staff" || role === "admin";

  if (!canView) {
    return (
      <div>
        <AdminTabs role={role} />
        <h1 className="mb-2 text-xl font-semibold [font-family:var(--font-serif)]">Mass email</h1>
        <p className="text-sm text-[var(--admin-text-muted)]">
          Only staff and admins can send mass emails.
        </p>
      </div>
    );
  }

  const supabase = createClerkSupabaseClient();
  const [{ data: jobs }, templates] = await Promise.all([
    supabase.from("jobs").select("id, title").order("title"),
    // A missing/misconfigured Resend API key shouldn't 500 the whole page --
    // it should just leave the template picker empty with an explanation.
    listPublishedEmailTemplates().catch(() => []),
  ]);

  return (
    <div>
      <AdminTabs role={role} />
      <h1 className="mb-2 text-xl font-semibold [font-family:var(--font-serif)]">Mass email</h1>
      <p className="mb-6 text-sm text-[var(--admin-text-muted)]">
        Email a group of applicants by status and job, plus any addresses that aren&apos;t in the
        system. Content comes from a published Resend template.
      </p>
      <MassEmailComposer jobs={jobs ?? []} templates={templates} />
    </div>
  );
}
