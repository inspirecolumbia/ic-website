import { auth, clerkClient } from "@clerk/nextjs/server";
import AdminTabs from "@/components/admin/AdminTabs";
import UserRoleManager, { type ManagedUser } from "@/components/admin/UserRoleManager";
import { roleRank } from "@/lib/user-roles";

// Generous but bounded, matching this codebase's other "fetch cap" pages
// (HISTORY_FETCH_CAP, APPLICATIONS_FETCH_CAP) -- a small nonprofit's staff
// roster isn't going to approach this, and getUserList's own hard max is
// 500 per call regardless.
const USERS_FETCH_CAP = 200;

export default async function UsersPage() {
  const { sessionClaims, userId: currentUserId } = await auth();
  const role = sessionClaims?.user_role as string | undefined;
  const isAdmin = role === "admin";

  if (!isAdmin) {
    return (
      <div>
        <AdminTabs role={role} />
        <p className="text-sm text-[var(--admin-text-muted)]">Only admins can manage user roles.</p>
      </div>
    );
  }

  const client = await clerkClient();
  const { data: clerkUsers } = await client.users.getUserList({ limit: USERS_FETCH_CAP });

  const users: ManagedUser[] = clerkUsers
    .map((u) => ({
      id: u.id,
      name: u.fullName || u.primaryEmailAddress?.emailAddress || u.id,
      email: u.primaryEmailAddress?.emailAddress ?? null,
      role: (u.publicMetadata as { role?: string } | null)?.role ?? null,
      banned: u.banned,
      createdAt: new Date(u.createdAt).toISOString(),
    }))
    // Unassigned accounts (the ones who "tried registering" and are
    // waiting on a decision) surface first, admins last since they're
    // read-only here anyway.
    .sort((a, b) => {
      const rankDiff = roleRank(a.role) - roleRank(b.role);
      return rankDiff !== 0 ? rankDiff : a.name.localeCompare(b.name);
    });

  return (
    <div>
      <AdminTabs role={role} />
      <h1 className="mb-2 text-xl font-semibold [font-family:var(--font-serif)]">Users</h1>
      <p className="mb-6 text-sm text-[var(--admin-text-muted)]">
        Promote a registered account to Member or Staff, or revoke access. Admin roles are managed
        in the Clerk dashboard, not here.
      </p>
      <UserRoleManager users={users} currentUserId={currentUserId} fetchCap={USERS_FETCH_CAP} />
    </div>
  );
}
