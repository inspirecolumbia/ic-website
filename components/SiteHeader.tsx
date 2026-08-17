"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useRef, useEffect, useState } from "react";

type SiteHeaderProps = {
  currentPath: string;
};

// Nav + Donate are grouped and right-aligned against the logo. Add new pages
// here, at the end of this list (they render to the left of Donate).
const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/leadership", label: "Leadership" },
  { href: "/positions", label: "Positions" },
];

export default function SiteHeader({ currentPath }: SiteHeaderProps) {
  const liRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });
  const [menuOpen, setMenuOpen] = useState(false);
  const [prevPath, setPrevPath] = useState(currentPath);

  if (currentPath !== prevPath) {
    setPrevPath(currentPath);
    setMenuOpen(false);
  }

  useEffect(() => {
    const activeIndex = navLinks.findIndex((l) => l.href === currentPath);
    const li = liRefs.current[activeIndex];
    if (li) {
      setIndicator({ left: li.offsetLeft, width: li.offsetWidth, ready: true });
    }
  }, [currentPath]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[rgba(250,247,240,0.85)] backdrop-blur-lg">
      <div className="mx-auto flex min-h-[76px] w-full max-w-[1100px] items-center justify-between gap-4 px-6 md:min-h-[88px] md:px-8">
        <Link href="/" className="flex shrink-0 items-center no-underline">
          <Image
            src="/InspireBlackLogo.png"
            alt="Inspire Columbia"
            height={44}
            width={220}
            className="h-10 w-auto md:h-12"
            priority
          />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <nav aria-label="Primary">
            <ul className="relative m-0 flex list-none items-center gap-6 p-0">
              {navLinks.map(({ href, label }, i) => {
                const isActive = currentPath === href;
                return (
                  <li key={href} ref={(el) => { liRefs.current[i] = el; }}>
                    <Link
                      href={href}
                      className={`inline-block px-0.5 py-1 text-[1.05rem] font-semibold no-underline transition-colors duration-200 ${isActive ? "text-[var(--brand)]" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}
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

          <Link
            href="/donate"
            className="donate-glow shrink-0 rounded-full bg-[var(--brand)] px-6 py-2.5 font-bold text-white no-underline transition-colors duration-150 hover:bg-[var(--brand-hover)]"
          >
            Donate
          </Link>
        </div>

        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-10 w-10 shrink-0 items-center justify-center text-[var(--ink)] md:hidden"
        >
          {menuOpen ? (
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            aria-label="Mobile"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden border-t border-[var(--line)] bg-[var(--surface)] md:hidden"
          >
            <ul className="m-0 flex list-none flex-col gap-1 p-6">
              {navLinks.map(({ href, label }) => {
                const isActive = currentPath === href;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`block py-3 text-[1.15rem] font-semibold no-underline ${isActive ? "text-[var(--brand)]" : "text-[var(--ink)]"}`}
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
              <li className="mt-3">
                <Link
                  href="/donate"
                  className="donate-glow block rounded-full bg-[var(--brand)] px-6 py-3 text-center font-bold text-white no-underline"
                >
                  Donate
                </Link>
              </li>
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
