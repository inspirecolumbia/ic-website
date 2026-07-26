import Link from "next/link";

export type JobQuickFact = {
  label: string;
  value: string;
};

export type Job = {
  slug: string;
  title: string;
  role: string;
  location: string;
  commitmentType: string;
  postingDate: string;
  quickFacts: JobQuickFact[];
  description: string;
  responsibilities: string[];
  qualifications: string[];
  applyUrl: string;
};

function ApplyButton({ jobTitle, href }: { jobTitle: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Apply for ${jobTitle} (opens in a new tab)`}
      className="inline-block bg-[var(--brand)] px-6 py-3 text-[1rem] font-semibold text-white no-underline transition-colors duration-200 hover:bg-[var(--brand-hover)]"
    >
      Apply now
    </a>
  );
}

export default function JobPosting({ job }: { job: Job }) {
  return (
    <main className="text-[var(--ink)]">
      <section className="bg-[var(--surface-blue)] py-14 md:py-[4.5rem]">
        <div className="mx-auto w-full max-w-[1100px] px-6 md:px-8">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-[var(--ink-muted)]">
            <ol className="m-0 flex list-none items-center p-0">
              <li>
                <Link href="/" className="no-underline hover:underline">
                  Home
                </Link>
              </li>
              <li aria-hidden="true" className="mx-2">
                /
              </li>
              <li>
                <Link href="/jobs" className="no-underline hover:underline">
                  Jobs
                </Link>
              </li>
              <li aria-hidden="true" className="mx-2">
                /
              </li>
              <li aria-current="page" className="text-[var(--ink)]">
                {job.title}
              </li>
            </ol>
          </nav>

          <p className="m-0 text-[0.9rem] font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
            {job.role}
          </p>
          <h1 className="mb-4 mt-4 max-w-[22ch] [font-family:var(--font-serif)] text-[clamp(2rem,5vw,4.2rem)] leading-[1.1] font-semibold">
            {job.title}
          </h1>

          <div className="mb-8 flex flex-wrap gap-2">
            {job.quickFacts.map((fact) => (
              <span
                key={fact.label}
                className="border border-[var(--line)] bg-[var(--card)] px-3 py-1.5 text-[0.85rem] font-medium text-[var(--ink-muted)]"
              >
                {fact.label}: {fact.value}
              </span>
            ))}
          </div>

          <ApplyButton jobTitle={job.title} href={job.applyUrl} />
        </div>
      </section>

      <section className="bg-[var(--surface)] py-13 md:py-16">
        <div className="mx-auto w-full max-w-[1100px] px-6 md:px-8">
          <h2 className="mb-2 mt-0 [font-family:var(--font-serif)] text-[clamp(1.55rem,3vw,2.3rem)] font-semibold">
            About the role
          </h2>
          <p className="mb-10 max-w-[70ch] text-[1.1rem] text-[var(--ink-muted)]">
            {job.description}
          </p>

          <h2 className="mb-2 mt-0 [font-family:var(--font-serif)] text-[clamp(1.55rem,3vw,2.3rem)] font-semibold">
            Responsibilities
          </h2>
          <ul className="mb-10 max-w-[70ch] list-disc space-y-2 pl-6 text-[1.05rem] text-[var(--ink-muted)]">
            {job.responsibilities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <h2 className="mb-2 mt-0 [font-family:var(--font-serif)] text-[clamp(1.55rem,3vw,2.3rem)] font-semibold">
            Qualifications
          </h2>
          <ul className="mb-10 max-w-[70ch] list-disc space-y-2 pl-6 text-[1.05rem] text-[var(--ink-muted)]">
            {job.qualifications.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-4 border-t border-[var(--line)] pt-8">
            <ApplyButton jobTitle={job.title} href={job.applyUrl} />
          </div>
        </div>
      </section>

      <section className="bg-[var(--surface-blue)] py-13 md:py-16">
        <div className="mx-auto w-full max-w-[1100px] px-6 md:px-8">
          <div className="border border-[var(--line)] bg-[var(--card)] p-6">
            <p className="m-0 text-[1.15rem] font-bold">Not the right fit?</p>
            <p className="mb-4 mt-1 text-[0.95rem] text-[var(--ink-muted)]">
              See every open role at Inspire Columbia.
            </p>
            <Link
              href="/jobs"
              className="font-semibold text-[var(--brand)] no-underline hover:underline"
            >
              View all open roles
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
