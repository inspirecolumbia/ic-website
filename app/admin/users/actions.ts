"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { isPromotableRole } from "@/lib/user-roles";
import { getUserDeleteEnabled } from "@/lib/settings";

// Every action here re-checks the caller's role server-side even though the
// page itself is already admin-gated -- same defense-in-depth reasoning as
// the applications actions, a Server Action is callable directly with a
// crafted request, not just through the page that happens to render a
// button for it.
async function requireAdmin(): Promise<{ error: string } | null> {
  const { sessionClaims } = await auth();
  const role = sessionClaims?.user_role as string | undefined;
  if (role !== "admin") return { error: "Not authorized." };
  return null;
}

// Admin is deliberately never a settable value here, and this checks the
// *target* user's current role too, not just the requested new one --
// admin status is assigned and removed exclusively through the Clerk
// dashboard, so this refuses to touch anyone who already has it (promoting
// AND demoting) rather than just rejecting "admin" as a requested value.
async function assertTargetIsNotAdmin(client: Awaited<ReturnType<typeof clerkClient>>, userId: string) {
  const target = await client.users.getUser(userId);
  if ((target.publicMetadata as { role?: string } | null)?.role === "admin") {
    return { error: "Admin roles can only be changed in the Clerk dashboard." };
  }
  return null;
}

export async function promoteUser(userId: string, role: string): Promise<{ error: string } | null> {
  const authError = await requireAdmin();
  if (authError) return authError;

  if (!isPromotableRole(role)) return { error: "Invalid role." };

  const client = await clerkClient();
  const targetError = await assertTargetIsNotAdmin(client, userId);
  if (targetError) return targetError;

  try {
    await client.users.updateUserMetadata(userId, { publicMetadata: { role } });
  } catch {
    return { error: "Couldn't update that user's role. Please try again." };
  }

  revalidatePath("/admin/users");
  return null;
}

// Full revocation, not just a role clear -- bans the Clerk account, which
// revokes all of that user's active sessions immediately and blocks any
// future sign-in until unbanned. Role stays whatever it was so restoring
// access later doesn't require re-promoting them from scratch.
export async function revokeUserAccess(userId: string): Promise<{ error: string } | null> {
  const authError = await requireAdmin();
  if (authError) return authError;

  const client = await clerkClient();
  const targetError = await assertTargetIsNotAdmin(client, userId);
  if (targetError) return targetError;

  try {
    await client.users.banUser(userId);
  } catch {
    return { error: "Couldn't revoke that user's access. Please try again." };
  }

  revalidatePath("/admin/users");
  return null;
}

export async function restoreUserAccess(userId: string): Promise<{ error: string } | null> {
  const authError = await requireAdmin();
  if (authError) return authError;

  const client = await clerkClient();
  const targetError = await assertTargetIsNotAdmin(client, userId);
  if (targetError) return targetError;

  try {
    await client.users.unbanUser(userId);
  } catch {
    return { error: "Couldn't restore that user's access. Please try again." };
  }

  revalidatePath("/admin/users");
  return null;
}

// Permanently removes the account from Clerk, not just access -- unlike
// revoke above, there's nothing to restore afterward. assertTargetIsNotAdmin
// already covers a self-delete attempt: the calling admin's own Clerk
// record has role "admin", so it gets rejected the same as any other admin
// target, no separate userId === callerId check needed.
export async function deleteUserAccount(userId: string): Promise<{ error: string } | null> {
  const authError = await requireAdmin();
  if (authError) return authError;

  // Real enforcement, not just a hidden button -- RLS/Clerk permissions
  // already let any admin do this regardless of the toggle.
  if (!(await getUserDeleteEnabled())) {
    return { error: "Deleting user accounts is currently turned off in Settings." };
  }

  const client = await clerkClient();
  const targetError = await assertTargetIsNotAdmin(client, userId);
  if (targetError) return targetError;

  try {
    await client.users.deleteUser(userId);
  } catch {
    return { error: "Couldn't delete that account. Please try again." };
  }

  revalidatePath("/admin/users");
  return null;
}
