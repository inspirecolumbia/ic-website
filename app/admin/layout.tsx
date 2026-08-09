import { auth, currentUser } from "@clerk/nextjs/server";
import AccountMenu from "@/components/admin/AccountMenu";
import AdminThemeClass from "@/components/admin/AdminThemeClass";

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
    <div className="min-h-screen bg-background">
      <AdminThemeClass />
      <nav className="flex items-center justify-between border-b border-border bg-background/85 px-6 py-4 backdrop-blur-lg">
        <span className="text-lg font-semibold text-foreground">Inspire Columbia Admin</span>
        <AccountMenu name={name} role={role} />
      </nav>
      <main className="mx-auto max-w-5xl p-6">{children}</main>
    </div>
  );
}
