import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

export type JobQuickFact = {
  label: string;
  value: string;
};

export type Job = {
  id: string;
  slug: string;
  title: string;
  role: string;
  location: string;
  commitmentType: string;
  postingDate: string;
  quickFacts: JobQuickFact[];
  description: string;
  applyUrl: string | null;
  postedDate: string;
  lastPublished: string;
  photoUrl: string | null;
};

// This project has no @tailwindcss/typography plugin, so Markdown output
// needs explicit per-element styling rather than a wrapping "prose" class --
// these mirror the heading/paragraph/list classes already used elsewhere on
// this page.
const markdownComponents: Components = {
  h1: ({ children }) => (
    <h2 className="mb-2 mt-8 first:mt-0 [font-family:var(--font-serif)] text-[clamp(1.55rem,3vw,2.3rem)] font-semibold">
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-8 first:mt-0 [font-family:var(--font-serif)] text-[clamp(1.55rem,3vw,2.3rem)] font-semibold">
      {children}
    </h2>
  ),
  p: ({ children }) => (
    <p className="mb-4 max-w-[70ch] text-[1.1rem] text-[var(--ink-muted)]">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 max-w-[70ch] list-disc space-y-2 pl-6 text-[1.05rem] text-[var(--ink-muted)]">
      {children}
    </ul>
  ),
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-[var(--ink)]">{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
};

const applyButtonClassName =
  "inline-block bg-[var(--brand)] px-6 py-3 text-[1rem] font-semibold text-white no-underline transition-colors duration-200 hover:bg-[var(--brand-hover)]";

// applyUrl set: staff opted for an external form, link out as before. Null:
// use the built-in application form, same tab, no "(opens in a new tab)".
function ApplyButton({ jobTitle, jobSlug, applyUrl }: { jobTitle: string; jobSlug: string; applyUrl: string | null }) {
  if (applyUrl) {
    return (
      <a
        href={applyUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Apply for ${jobTitle} (opens in a new tab)`}
        className={applyButtonClassName}
      >
        Apply now
      </a>
    );
  }

  return (
    <Link href={`/jobs/${jobSlug}/apply`} className={applyButtonClassName}>
      Apply now
    </Link>
  );
}

export default function JobPosting({ job }: { job: Job }) {
  return (
    <main className="text-[var(--ink)]">
      <section className="bg-[var(--surface-blue)]">
        <div className="mx-auto w-full max-w-[1100px] px-6 md:px-8">
          {/* No gap and no shared vertical padding here on purpose: the photo
              column carries zero padding of its own so it stretches, via
              grid's default item-stretch, to exactly match the text
              column's height (flush with the section's top and bottom edges
              on desktop) instead of being independently centered/inset. */}
          <div className={job.photoUrl ? "grid md:grid-cols-2" : undefined}>
            <div className="py-14 md:py-[4.5rem]">
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
                    className="border border-[var(--line)] bg-[var(--card-public)] px-3 py-1.5 text-[0.85rem] font-medium text-[var(--ink-muted)]"
                  >
                    {fact.label}: {fact.value}
                  </span>
                ))}
              </div>

              <ApplyButton jobTitle={job.title} jobSlug={job.slug} applyUrl={job.applyUrl} />
            </div>

            {job.photoUrl && (
              // On desktop, height comes from the grid row (matching the
              // text column, flush with the section's top/bottom edges) --
              // there's no sibling row to stretch to once it stacks on
              // mobile, so aspect-[4/3] is a fallback there only. (Tracks
              // JOB_PHOTO_ASPECT_RATIO in lib/jobPhoto.ts; kept as a literal
              // class since Tailwind can't resolve an interpolated
              // arbitrary-value class at build time.) No rounded corners,
              // by design, unlike most other cards on this page.
              <div className="relative aspect-[4/3] w-full overflow-hidden md:aspect-auto">
                <Image
                  src={job.photoUrl}
                  alt={`Photo for the ${job.title} position at Inspire Columbia`}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                  priority
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-[var(--surface)] py-13 md:py-16">
        <div className="mx-auto w-full max-w-[1100px] px-6 md:px-8">
          <h2 className="mb-2 mt-0 [font-family:var(--font-serif)] text-[clamp(1.55rem,3vw,2.3rem)] font-semibold">
            About the role
          </h2>
          <div className="mb-6">
            <ReactMarkdown components={markdownComponents}>{job.description}</ReactMarkdown>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-[var(--line)] pt-8">
            <ApplyButton jobTitle={job.title} jobSlug={job.slug} applyUrl={job.applyUrl} />
          </div>
        </div>
      </section>

      <section className="bg-[var(--surface-blue)] py-13 md:py-16">
        <div className="mx-auto w-full max-w-[1100px] px-6 md:px-8">
          <div className="border border-[var(--line)] bg-[var(--card-public)] p-6">
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

      <p className="mx-auto w-full max-w-[1100px] px-6 py-4 text-[0.8rem] text-[var(--ink-muted)] md:px-8">
        {job.postedDate && <>Posted {job.postedDate} · </>}
        {job.lastPublished && <>Last published {job.lastPublished} · </>}
        Posting ID: {job.id}
      </p>
    </main>
  );
}
