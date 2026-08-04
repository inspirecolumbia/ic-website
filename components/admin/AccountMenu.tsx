"use client";

import { useClerk } from "@clerk/nextjs";
import { ChevronDown, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AccountMenu({ name, role }: { name: string; role: string }) {
  const { signOut } = useClerk();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-1.5 text-sm outline-none hover:bg-[var(--admin-surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--admin-brand)]">
        <span className="flex flex-col items-end leading-tight">
          <span className="font-medium text-[var(--admin-text)]">{name}</span>
          <span className="text-xs capitalize text-[var(--admin-text-muted)]">{role}</span>
        </span>
        <ChevronDown className="size-4 text-[var(--admin-text-muted)]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem variant="destructive" onClick={() => signOut()}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
