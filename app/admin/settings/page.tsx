import { auth } from "@clerk/nextjs/server";
import AdminTabs from "@/components/admin/AdminTabs";
import AppSettingsForm from "@/components/admin/AppSettingsForm";
import { getResendFromAddress, getStaffAlertTemplateId } from "@/lib/settings";
import { listStaffAlertTemplateOptions } from "@/app/admin/settings/actions";

export default async function SettingsPage() {
  const { sessionClaims } = await auth();
  const role = sessionClaims?.user_role as string | undefined;

  if (role !== "admin") {
    return (
      <div>
        <AdminTabs role={role} />
        <h1 className="mb-2 text-xl font-semibold [font-family:var(--font-serif)]">Settings</h1>
        <p className="text-sm text-[var(--admin-text-muted)]">Only admins can view settings.</p>
      </div>
    );
  }

  const [fromAddress, staffAlertTemplateId, templateOptions] = await Promise.all([
    getResendFromAddress(),
    getStaffAlertTemplateId(),
    listStaffAlertTemplateOptions(),
  ]);

  return (
    <div>
      <AdminTabs role={role} />
      <h1 className="mb-6 text-xl font-semibold [font-family:var(--font-serif)]">Settings</h1>
      <AppSettingsForm
        initialFromAddress={fromAddress ?? ""}
        initialStaffAlertTemplateId={staffAlertTemplateId}
        templates={"templates" in templateOptions ? templateOptions.templates : []}
      />
    </div>
  );
}
