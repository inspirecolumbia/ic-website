// The three roles this app actually understands. "admin" is deliberately
// excluded from PROMOTABLE_ROLES -- admin is assigned and removed only
// through the Clerk dashboard, never through the in-app role manager (see
// app/admin/users/actions.ts).
export const PROMOTABLE_ROLES = ["member", "staff"] as const;
export type PromotableRole = (typeof PROMOTABLE_ROLES)[number];

export function isPromotableRole(value: string): value is PromotableRole {
  return (PROMOTABLE_ROLES as readonly string[]).includes(value);
}

// Higher rank sorts later -- used to surface unassigned accounts (the ones
// waiting on an admin's decision) first in the user list, admins last
// since they're read-only there anyway.
const ROLE_RANK: Record<string, number> = { admin: 3, staff: 2, member: 1 };

export function roleRank(role: string | null): number {
  return ROLE_RANK[role ?? ""] ?? 0;
}

export function roleLabel(role: string | null): string {
  if (role === "admin") return "Admin";
  if (role === "staff") return "Staff";
  if (role === "member") return "Member";
  return "No role assigned";
}
