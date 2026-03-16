"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useRef, useEffect, useState } from "react";

type SiteHeaderProps = {
  currentPath: "/" | "/about" | "/donate";
};

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/donate", label: "Donate" },
  { href: "/about", label: "About" },
];

export default function SiteHeader({ currentPath }: SiteHeaderProps) {
  const liRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  useEffect(() => {
    const activeIndex = navLinks.findIndex((l) => l.href === currentPath);
    const li = liRefs.current[activeIndex];
    if (li) {
      setIndicator({ left: li.offsetLeft, width: li.offsetWidth, ready: true });
    }
  }, [currentPath]);

  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(195,210,240,0.4)] bg-[rgba(248,251,255,0.55)] backdrop-blur-lg shadow-[0_4px_24px_rgba(29,78,216,0.08)]">
      <div className="mx-auto flex min-h-[72px] w-full max-w-[1100px] items-center justify-between gap-8 px-6 md:px-8">
        <Link href="/" className="flex items-center no-underline">
          <Image
            src="/InspireBlackLogo.png"
            alt="Inspire Columbia"
            height={36}
            width={180}
            className="h-9 w-auto"
            priority
          />
        </Link>
        <nav aria-label="Primary">
          <ul className="relative m-0 flex list-none gap-6 p-0 md:gap-4">
            {navLinks.map(({ href, label }, i) => {
              const isActive = currentPath === href;
              return (
                <li key={href} ref={(el) => { liRefs.current[i] = el; }}>
                  <Link
                    href={href}
                    className={`inline-block px-0.5 py-1 text-base font-semibold no-underline transition-colors duration-200 ${isActive ? "text-[var(--brand)]" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
            {indicator.ready && (
              <motion.div
                className="absolute bottom-0 h-0.5 bg-[var(--brand)]"
                animate={{ left: indicator.left, width: indicator.width }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              />
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}
