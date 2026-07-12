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
  learnMoreUrl?: string;
  learnMoreLabel?: string;
};

function ApplyButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block bg-[var(--brand)] px-6 py-3 text-[1rem] font-semibold text-white no-underline transition-colors duration-200 hover:bg-[var(--brand-hover)]"
    >
      Apply now
    </a>
  );
}

export default function JobPosting({ job }: { job: Job }) {
  const postedDate = new Date(job.postingDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="text-[var(--ink)]">
      <section className="bg-[rgba(220,236,255,0.55)] py-14 md:py-[4.5rem]">
        <div className="mx-auto w-full max-w-[1100px] px-6 md:px-8">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-[var(--ink-muted)]">
            <Link href="/" className="no-underline hover:underline">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link href="/jobs" className="no-underline hover:underline">
              Jobs
            </Link>
            <span className="mx-2">/</span>
            <span className="text-[var(--ink)]">{job.title}</span>
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
                className="border border-[var(--line)] bg-[rgba(255,255,255,0.7)] px-3 py-1 text-[0.85rem] font-medium text-[var(--ink-muted)]"
              >
                {fact.label}: {fact.value}
              </span>
            ))}
          </div>

          <ApplyButton href={job.applyUrl} />
        </div>
      </section>

      <div className="mx-auto flex h-[280px] w-full max-w-[1100px] items-center justify-center border-2 border-dashed border-[var(--line)] bg-[var(--surface-strong)] text-[0.75rem] font-bold uppercase tracking-widest text-[var(--ink-muted)] md:my-0">
        Hero Photo
      </div>

      <section className="bg-[rgba(255,255,255,0.55)] py-13 md:py-16">
        <div className="mx-auto w-full max-w-[1100px] px-6 md:px-8">
          <div className="mb-10 grid grid-cols-1 gap-6 border border-[var(--line)] bg-[rgba(255,255,255,0.7)] p-6 sm:grid-cols-2 lg:grid-cols-4">
            {job.quickFacts.map((fact) => (
              <div key={fact.label}>
                <p className="m-0 text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
                  {fact.label}
                </p>
                <p className="mb-0 mt-0.5 text-[1rem] text-[var(--ink)]">{fact.value}</p>
              </div>
            ))}
          </div>

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

          {job.learnMoreUrl && (
            <p className="mb-10 text-[1rem]">
              <Link
                href={job.learnMoreUrl}
                className="font-semibold text-[var(--brand)] no-underline hover:underline"
              >
                {job.learnMoreLabel ?? "Learn more"}
              </Link>
            </p>
          )}

          <p className="mb-10 text-sm text-[var(--ink-muted)]">Posted {postedDate}</p>

          <div className="flex flex-wrap items-center gap-4 border-t border-[var(--line)] pt-8">
            <ApplyButton href={job.applyUrl} />
          </div>
        </div>
      </section>

      <section className="bg-[rgba(240,246,255,0.55)] py-13 md:py-16">
        <div className="mx-auto w-full max-w-[1100px] px-6 md:px-8">
          <div className="border border-[var(--line)] bg-[rgba(255,255,255,0.7)] p-6">
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
