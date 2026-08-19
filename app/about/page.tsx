import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

const missionPhotos = [
  { src: "/pictures/community-program-workshop-session.jpg", alt: "A program leader speaking to a small group of students during a workshop session" },
  { src: "/pictures/community-program-certificates.jpg", alt: "Students holding up certificates of completion" },
  { src: "/pictures/tedx-speaker-solo-stage.jpg", alt: "A speaker addressing the audience from the TEDxCongaree Vista stage" },
];

export const metadata: Metadata = {
  title: "About",
  description: "Learn about Inspire Columbia — a 501(c)(3) nonprofit led by students in Columbia, South Carolina, producing leadership events and educational programming.",
  openGraph: {
    title: "About | Inspire Columbia",
    description: "Learn about Inspire Columbia — a 501(c)(3) nonprofit led by students in Columbia, South Carolina, producing leadership events and educational programming.",
    url: "https://inspirecolumbia.org/about",
  },
  twitter: {
    title: "About | Inspire Columbia",
    description: "Learn about Inspire Columbia — a 501(c)(3) nonprofit led by students in Columbia, South Carolina, producing leadership events and educational programming.",
  },
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader currentPath="/about" />
      <main className="text-[var(--ink)]">
        <section className="bg-[var(--surface-blue)] py-14 md:py-[4.5rem]">
          <div className="mx-auto w-full max-w-[1100px] px-6 md:px-8">
            <h1 className="m-0 max-w-[22ch] [font-family:var(--font-serif)] text-[clamp(2rem,5vw,4.2rem)] leading-[1.1] font-semibold">
              About Inspire Columbia
            </h1>
            <p className="mt-6 mb-0 max-w-[65ch] text-[clamp(1.02rem,2.2vw,1.3rem)] text-[var(--ink-muted)]">
              Inspire Columbia is a 501(c)(3) nonprofit organization led by students and
              community members in Columbia, South Carolina. We produce leadership events,
              community workshops, and civic programming that brings people together around
              positive change.
            </p>
          </div>
        </section>

        <section className="bg-[var(--surface)] py-13 md:py-16">
          <div className="mx-auto w-full max-w-[1100px] px-6 md:px-8">
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {missionPhotos.map((photo) => (
                <div key={photo.src} className="aspect-[4/3] overflow-hidden rounded-[10px]">
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    width={800}
                    height={600}
                    className="block h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
            <h2 className="mb-8 mt-0 [font-family:var(--font-serif)] text-[clamp(1.55rem,3vw,2.3rem)] font-semibold">
              Mission Statement
            </h2>
            <div className="w-full rounded-[10px] bg-[var(--surface-blue)] px-7 py-7 md:px-9 md:py-8">
              <p className="m-0 [font-family:var(--font-serif)] text-[clamp(1.1rem,1.9vw,1.35rem)] leading-[1.5] font-medium">
                Inspire Columbia creates stages for the stories, ideas, and talent that make our city extraordinary. We connect our community through powerful ideas and give Columbia&#39;s best a chance to be seen.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-[var(--surface)] pb-13 md:pb-16">
          <div className="mx-auto w-full max-w-[1100px] px-6 md:px-8">
            <h2 className="mb-8 mt-0 [font-family:var(--font-serif)] text-[clamp(1.55rem,3vw,2.3rem)] font-semibold">
              Our Story
            </h2>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_300px]">
              <div>
                <p className="mb-5 max-w-[65ch] text-[1.15rem]">
                  Inspire Columbia was founded by University of South Carolina students who wanted
                  to bring professional-grade civic programming back to their own city. Formerly
                  known as ChangeMakers Events, the organization is entirely student-run, handling
                  its own event production, sponsorships, and community outreach, and it reinvests
                  every dollar it raises directly into the Columbia community.
                </p>
                <p className="mb-5 max-w-[65ch] text-[1.15rem]">
                  Our flagship production, TEDxCongaree Vista, is the first standard TEDx event
                  held in Columbia in over ten years. Beyond our flagship event, we run an annual
                  associate program that gives Columbia-area students hands-on experience
                  producing real community programming.
                </p>
                <p className="m-0 max-w-[65ch] text-[1.15rem]">
                  As a 501(c)(3) nonprofit corporation, all donations to Inspire Columbia are
                  fully tax-deductible. Funds raised stay local, covering the essential costs of
                  putting on accessible, informative, and action-oriented events for the
                  community.
                </p>
              </div>
              <div className="flex h-fit items-center justify-center overflow-hidden rounded-[10px] bg-[var(--surface-blue-strong)] p-10 shadow-[0_12px_32px_rgba(10,14,26,0.18)]">
                <Image
                  src="/pictures/inspire-columbia-logo-square.png"
                  alt="Inspire Columbia logo mark"
                  width={401}
                  height={401}
                  className="block h-auto w-full max-w-[220px] object-contain"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[var(--surface-blue)] py-13 md:py-16">
          <div className="mx-auto w-full max-w-[1100px] px-6 md:px-8">
            <h2 className="mb-4 mt-0 [font-family:var(--font-serif)] text-[clamp(1.55rem,3vw,2.3rem)] font-semibold text-black">
              Meet Our Leadership
            </h2>
            <p className="mb-8 max-w-[60ch] text-[1.1rem] text-black/80">
              Inspire Columbia is run entirely by current University of South Carolina students.
            </p>
            <Link
              href="/leadership"
              className="inline-block rounded-full bg-[var(--brand)] px-7 py-3.5 font-bold text-[var(--surface-blue)] no-underline transition-colors duration-150 hover:bg-black/90"
            >
              Meet the Team
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
