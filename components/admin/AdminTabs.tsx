"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/applications", label: "Applications", staffOnly: true },
  { href: "/admin/templates", label: "Templates" },
  { href: "/admin/history", label: "History" },
  { href: "/admin/users", label: "Users", adminOnly: true },
];

// role is optional (some pages haven't threaded it through) so the tab
// still renders for those, but every page that gates real applicant data
// should pass its own already-computed role here -- this is a UI nicety
// (hiding a link a member can't use anyway), not the enforcement itself,
// which lives server-side in each page/action/RPC.
export default function AdminTabs({ role }: { role?: string }) {
  const pathname = usePathname();
  const visibleTabs = tabs.filter((tab) => {
    if (tab.adminOnly) return role === "admin";
    if (tab.staffOnly) return role === "staff" || role === "admin";
    return true;
  });

  return (
    <div className="mb-6 border-b">
      <Link
        href="/admin"
        className="mb-2 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        ← Dashboard
      </Link>
      <nav className="flex gap-4">
        {visibleTabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "border-b-2 px-1 pb-2 text-sm font-medium no-underline",
                active
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
