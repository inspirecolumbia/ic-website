import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import type { Job } from "@/components/JobPosting";
import jobs from "@/data/jobs.json";

export const metadata: Metadata = {
  title: "Open Roles",
  description: "See every open role at Inspire Columbia, a student-led nonprofit in Columbia, South Carolina.",
  openGraph: {
    title: "Open Roles | Inspire Columbia",
    description: "See every open role at Inspire Columbia, a student-led nonprofit in Columbia, South Carolina.",
    url: "https://inspirecolumbia.org/jobs",
  },
  twitter: {
    title: "Open Roles | Inspire Columbia",
    description: "See every open role at Inspire Columbia, a student-led nonprofit in Columbia, South Carolina.",
  },
};

export default function JobsIndexPage() {
  const openRoles = jobs as Job[];

  return (
    <>
      <SiteHeader currentPath="/jobs" />
      <main className="text-[var(--ink)]">
        <section className="bg-[var(--surface-blue)] py-14 md:py-[4.5rem]">
          <div className="mx-auto w-full max-w-[1100px] px-6 md:px-8">
            <h1 className="m-0 max-w-[22ch] [font-family:var(--font-serif)] text-[clamp(2rem,5vw,4.2rem)] leading-[1.1] font-semibold">
              Open roles
            </h1>
            <p className="mt-6 mb-0 max-w-[65ch] text-[clamp(1.02rem,2.2vw,1.3rem)] text-[var(--ink-muted)]">
              Join a student-led team producing leadership events and community
              programming in Columbia, SC.
            </p>
          </div>
        </section>

        <section className="bg-[var(--surface)] py-13 md:py-16">
          <div className="mx-auto w-full max-w-[1100px] px-6 md:px-8">
            {openRoles.length === 0 ? (
              <p className="max-w-[60ch] text-[1.1rem] text-[var(--ink-muted)]">
                There are no open roles right now. Check back soon, or email{" "}
                <a
                  href="mailto:info@inspirecolumbia.org"
                  className="font-semibold text-[var(--brand)] no-underline hover:underline"
                >
                  info@inspirecolumbia.org
                </a>{" "}
                to hear about future openings.
              </p>
            ) : (
              <ul className="m-0 grid list-none grid-cols-1 gap-6 p-0 sm:grid-cols-2">
                {openRoles.map((job) => (
                  <li key={job.slug}>
                    <Link
                      href={`/jobs/${job.slug}`}
                      className="block h-full rounded-[10px] border border-[var(--line)] bg-[var(--card)] p-6 no-underline transition-all duration-150 hover:border-[var(--brand)] hover:shadow-[0_8px_24px_rgba(29,78,216,0.12)]"
                    >
                      <p className="m-0 text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
                        {job.role}
                      </p>
                      <p className="mb-3 mt-1 text-[1.4rem] font-semibold text-[var(--ink)] [font-family:var(--font-serif)]">
                        {job.title}
                      </p>
                      <p className="m-0 text-[0.95rem] text-[var(--ink-muted)]">
                        {job.location} &middot; {job.commitmentType}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
