import { auth } from "@clerk/nextjs/server";
import { createClerkSupabaseClient } from "@/lib/supabase/clerk";
import AdminTabs from "@/components/admin/AdminTabs";

export default async function TemplatesPage() {
  const { sessionClaims } = await auth();
  const role = sessionClaims?.user_role as string | undefined;
  const canManage = role === "staff" || role === "admin";

  const supabase = createClerkSupabaseClient();
  const { data: templates } = await supabase
    .from("application_templates")
    .select("*")
    .order("name");

  return (
    <div>
      <AdminTabs />
      <h1 className="mb-2 text-xl font-semibold [font-family:var(--font-serif)]">
        Application templates
      </h1>
      <p className="mb-6 text-sm text-[var(--admin-text-muted)]">
        The built-in application forms job postings can use instead of an external Apply URL.
        Selectable from a job&apos;s editor. Creating new templates isn&apos;t supported yet.
      </p>

      {!canManage ? (
        <p className="text-sm text-[var(--admin-text-muted)]">
          Only staff and admins can view application templates.
        </p>
      ) : templates && templates.length > 0 ? (
        <ul className="m-0 flex flex-col gap-3 p-0">
          {templates.map((template) => (
            <li
              key={template.id}
              className="list-none rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4"
            >
              <p className="m-0 font-medium text-[var(--admin-text)]">{template.name}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--admin-text-muted)]">No application templates yet.</p>
      )}
    </div>
  );
}
