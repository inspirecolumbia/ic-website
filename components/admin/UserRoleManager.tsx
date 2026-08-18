"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { MoreVertical } from "lucide-react";
import { promoteUser, restoreUserAccess, revokeUserAccess } from "@/app/admin/users/actions";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDateTime } from "@/lib/history";
import { roleLabel } from "@/lib/user-roles";

export type ManagedUser = {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  banned: boolean;
  createdAt: string;
};

const roleBadgeClass: Record<string, string> = {
  admin: "bg-[var(--admin-brand-soft)] text-[var(--admin-brand)]",
  staff: "bg-[var(--admin-success-soft)] text-[var(--admin-success)]",
  member: "bg-[var(--admin-neutral-soft)] text-[var(--admin-text-muted)]",
};

function RoleBadge({ role }: { role: string | null }) {
  return (
    <span
      className={
        "inline-block rounded-full px-2 py-0.5 text-xs font-medium " +
        (role ? (roleBadgeClass[role] ?? roleBadgeClass.member) : "bg-[var(--admin-neutral-soft)] text-[var(--admin-text-muted)]")
      }
    >
      {roleLabel(role)}
    </span>
  );
}

function UserRow({
  user,
  isCurrentUser,
  onChanged,
}: {
  user: ManagedUser;
  isCurrentUser: boolean;
  onChanged: (message: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [pending, startTransition] = useTransition();

  function runAction(action: () => Promise<{ error: string } | null>, successMessage: string) {
    setError(null);
    startTransition(() => {
      action().then((result) => {
        if (result && "error" in result) {
          setError(result.error);
        } else {
          onChanged(successMessage);
        }
      });
    });
  }

  const isAdmin = user.role === "admin";

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium text-[var(--admin-text)]">
          {user.name}
          {isCurrentUser && <span className="ml-1.5 text-xs text-[var(--admin-text-muted)]">(you)</span>}
        </div>
        {user.email && <div className="text-xs text-[var(--admin-text-muted)]">{user.email}</div>}
      </TableCell>
      <TableCell>
        <RoleBadge role={user.role} />
      </TableCell>
      <TableCell>
        {user.banned ? (
          <span className="rounded-full bg-[var(--admin-danger-soft)] px-2 py-0.5 text-xs font-medium text-[var(--admin-danger)]">
            Access revoked
          </span>
        ) : (
          <span className="rounded-full bg-[var(--admin-success-soft)] px-2 py-0.5 text-xs font-medium text-[var(--admin-success)]">
            Active
          </span>
        )}
      </TableCell>
      <TableCell className="text-xs text-[var(--admin-text-muted)]">{formatDateTime(user.createdAt)}</TableCell>
      <TableCell>
        {isAdmin ? (
          <span className="text-xs text-[var(--admin-text-muted)]">Managed in Clerk dashboard</span>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label={`More actions for ${user.name}`}
                  disabled={pending}
                  className="flex size-8 items-center justify-center rounded-md text-[var(--admin-text-muted)] outline-none hover:bg-[var(--admin-surface-hover)] hover:text-[var(--admin-text)] focus-visible:ring-2 focus-visible:ring-[var(--admin-brand)] disabled:pointer-events-none disabled:opacity-40"
                >
                  <MoreVertical className="size-4" />
                </button>
              }
            />
            <DropdownMenuContent align="end">
              {user.banned ? (
                <DropdownMenuItem onClick={() => runAction(() => restoreUserAccess(user.id), "Access restored.")}>
                  Restore access
                </DropdownMenuItem>
              ) : (
                <>
                  {user.role !== "member" && (
                    <DropdownMenuItem
                      onClick={() => runAction(() => promoteUser(user.id, "member"), "Set as Member.")}
                    >
                      Set as Member
                    </DropdownMenuItem>
                  )}
                  {user.role !== "staff" && (
                    <DropdownMenuItem
                      onClick={() => runAction(() => promoteUser(user.id, "staff"), "Set as Staff.")}
                    >
                      Set as Staff
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setConfirmRevoke(true)}>
                    Revoke access
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {error && (
          <p role="alert" className="mt-1 text-xs text-[var(--admin-danger)]">
            {error}
          </p>
        )}

        <AlertDialog open={confirmRevoke} onOpenChange={setConfirmRevoke}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke access for {user.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This immediately signs them out everywhere and blocks any future sign-in, until you
                restore access from this same page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={pending}
                onClick={() => {
                  setConfirmRevoke(false);
                  runAction(() => revokeUserAccess(user.id), "Access revoked.");
                }}
              >
                {pending ? "Revoking..." : "Revoke access"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}

export default function UserRoleManager({
  users,
  currentUserId,
  fetchCap,
}: {
  users: ManagedUser[];
  currentUserId: string | null;
  fetchCap: number;
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!statusMessage) return;
    const timeout = setTimeout(() => setStatusMessage(null), 4000);
    return () => clearTimeout(timeout);
  }, [statusMessage]);

  const filteredUsers = useMemo(() => {
    let result = users;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) => u.name.toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q)
      );
    }
    if (roleFilter !== "all") {
      result = result.filter((u) => (roleFilter === "none" ? !u.role : u.role === roleFilter));
    }
    return result;
  }, [users, search, roleFilter]);

  if (users.length === 0) {
    return <p className="text-sm text-[var(--admin-text-muted)]">No registered accounts yet.</p>;
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? "all")}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="none">No role assigned</SelectItem>
            <SelectItem value="member">Member</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {statusMessage && (
        <p
          role="status"
          className="mb-3 rounded-md bg-[var(--admin-success-soft)] px-3 py-2 text-sm text-[var(--admin-success)]"
        >
          {statusMessage}
        </p>
      )}

      <p className="mb-2 text-sm text-[var(--admin-text-muted)]">
        Showing {filteredUsers.length} of {users.length} accounts
        {users.length >= fetchCap ? ` (capped at the most recent ${fetchCap})` : ""}
      </p>

      <div className="overflow-x-auto rounded-lg border border-[var(--admin-border)]">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                isCurrentUser={user.id === currentUserId}
                onChanged={setStatusMessage}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredUsers.length === 0 && (
        <p className="mt-6 text-center text-sm text-[var(--admin-text-muted)]">
          No accounts match your search.
        </p>
      )}
    </div>
  );
}
