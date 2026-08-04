"use client";

import { usePathname } from "next/navigation";

const socialLinks = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/inspirecolumbia/",
    path: "M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3V9zm7 0h3.8v1.64h.05c.53-1 1.83-2.06 3.77-2.06 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.7c0-1.36-.02-3.1-1.89-3.1-1.9 0-2.19 1.48-2.19 3v5.8h-4V9z",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/inspirecolumbia/",
    path: "M12 2.2c3.2 0 3.58.01 4.85.07 1.17.05 1.97.24 2.43.4a4.9 4.9 0 0 1 1.77 1.15 4.9 4.9 0 0 1 1.15 1.77c.16.46.35 1.26.4 2.43.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.24 1.97-.4 2.43a4.9 4.9 0 0 1-1.15 1.77 4.9 4.9 0 0 1-1.77 1.15c-.46.16-1.26.35-2.43.4-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.97-.24-2.43-.4a4.9 4.9 0 0 1-1.77-1.15 4.9 4.9 0 0 1-1.15-1.77c-.16-.46-.35-1.26-.4-2.43C2.21 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85c.05-1.17.24-1.97.4-2.43a4.9 4.9 0 0 1 1.15-1.77A4.9 4.9 0 0 1 5.6 1.8c.46-.16 1.26-.35 2.43-.4C9.3 2.21 9.68 2.2 12 2.2zm0 1.8c-3.15 0-3.5.01-4.73.07-.96.04-1.48.2-1.82.34-.46.18-.78.39-1.13.73-.34.35-.55.67-.73 1.13-.14.34-.3.86-.34 1.82C3.19 8.5 3.18 8.85 3.18 12s.01 3.5.07 4.73c.04.96.2 1.48.34 1.82.18.46.39.78.73 1.13.35.34.67.55 1.13.73.34.14.86.3 1.82.34 1.23.06 1.58.07 4.73.07s3.5-.01 4.73-.07c.96-.04 1.48-.2 1.82-.34.46-.18.78-.39 1.13-.73.34-.35.55-.67.73-1.13.14-.34.3-.86.34-1.82.06-1.23.07-1.58.07-4.73s-.01-3.5-.07-4.73c-.04-.96-.2-1.48-.34-1.82a2.97 2.97 0 0 0-.73-1.13 2.97 2.97 0 0 0-1.13-.73c-.34-.14-.86-.3-1.82-.34C15.5 3.99 15.15 3.98 12 3.98zm0 3.05a4.97 4.97 0 1 1 0 9.94 4.97 4.97 0 0 1 0-9.94zm0 1.8a3.17 3.17 0 1 0 0 6.34 3.17 3.17 0 0 0 0-6.34zm5.16-1.99a1.16 1.16 0 1 1-2.32 0 1.16 1.16 0 0 1 2.32 0z",
  },
];

export default function Footer() {
  const pathname = usePathname();
  const year = new Date().getFullYear();

  if (pathname.startsWith("/admin")) return null;

  return (
    <footer className="border-t border-[var(--line)] bg-[var(--surface)]">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 px-6 py-8 text-sm text-[var(--ink-muted)] md:flex-row md:items-center md:justify-between md:px-8">
        <p className="m-0">Copyright &copy; {year} Inspire Columbia Inc. All rights reserved.</p>
        <div className="flex items-center gap-5">
          <a
            href="mailto:info@inspirecolumbia.org"
            className="font-semibold text-[var(--brand)] no-underline hover:underline"
          >
            info@inspirecolumbia.org
          </a>
          <div className="flex items-center gap-3">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="flex h-8 w-8 items-center justify-center border border-[var(--line)] text-[var(--ink-muted)] transition-colors duration-150 hover:border-[var(--brand)] hover:text-[var(--brand)]"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                  <path d={social.path} />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
