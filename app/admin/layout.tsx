import { auth, currentUser } from "@clerk/nextjs/server";
import AccountMenu from "@/components/admin/AccountMenu";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await auth.protect();
  const { sessionClaims } = await auth();
  const role = sessionClaims?.user_role as string | undefined;

  if (!role || !["member", "staff", "admin"].includes(role)) {
    return <p className="p-8">Your account doesn&apos;t have a role assigned yet. Contact an admin.</p>;
  }

  const user = await currentUser();
  const name = user?.fullName || user?.primaryEmailAddress?.emailAddress || "Signed in";

  return (
    <div className="min-h-screen bg-[var(--admin-background)]">
      <nav className="flex items-center justify-between border-b border-[var(--line)] bg-[rgba(250,247,240,0.85)] px-6 py-4 backdrop-blur-lg">
        <span className="text-lg font-semibold text-[var(--ink)]">Inspire Columbia Admin</span>
        <AccountMenu name={name} role={role} />
      </nav>
      <main className="mx-auto max-w-5xl p-6">{children}</main>
    </div>
  );
}
