"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/templates", label: "Templates" },
  { href: "/admin/history", label: "History" },
];

export default function AdminTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-6 border-b">
      <Link
        href="/admin"
        className="mb-2 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        ← Dashboard
      </Link>
      <nav className="flex gap-4">
        {tabs.map((tab) => {
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
