import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Page Not Found",
};

export default function NotFound() {
  return (
    <>
      <SiteHeader currentPath="" />
      <main className="text-[var(--ink)]">
        <section className="bg-[var(--surface-blue)] py-24 md:py-[6rem]">
          <div className="mx-auto w-full max-w-[1100px] px-6 text-center md:px-8">
            <p className="m-0 text-[0.9rem] font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
              404
            </p>
            <h1 className="mb-4 mt-4 [font-family:var(--font-serif)] text-[clamp(2rem,5vw,3.4rem)] leading-[1.1] font-semibold">
              Page not found
            </h1>
            <p className="mx-auto mb-8 max-w-[50ch] text-[1.1rem] text-[var(--ink-muted)]">
              The page you&apos;re looking for doesn&apos;t exist or may have moved.
            </p>
            <Link
              href="/"
              className="inline-block bg-[var(--brand)] px-6 py-3 text-[1rem] font-semibold text-white no-underline transition-colors duration-200 hover:bg-[var(--brand-hover)]"
            >
              Back to home
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
