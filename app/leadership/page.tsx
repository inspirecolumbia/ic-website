import type { Metadata } from "next";
import Image from "next/image";
import LeadershipSection from "@/components/LeadershipSection";
import SiteHeader from "@/components/SiteHeader";
import { executiveLeadership, boardOfDirectors } from "@/data/people";

export const metadata: Metadata = {
  title: "Leadership",
  description: "Meet the students leading Inspire Columbia — Executive Leadership and Board of Directors, in Columbia, South Carolina.",
  openGraph: {
    title: "Leadership | Inspire Columbia",
    description: "Meet the students leading Inspire Columbia — Executive Leadership and Board of Directors, in Columbia, South Carolina.",
    url: "https://inspirecolumbia.org/leadership",
  },
  twitter: {
    title: "Leadership | Inspire Columbia",
    description: "Meet the students leading Inspire Columbia — Executive Leadership and Board of Directors, in Columbia, South Carolina.",
  },
};

export default function LeadershipPage() {
  return (
    <>
      <SiteHeader currentPath="/leadership" />
      <main className="text-[var(--ink)]">
        <section className="bg-[var(--surface-blue)] py-14 md:py-[4.5rem]">
          <div className="mx-auto w-full max-w-[1100px] px-6 md:px-8">
            <h1 className="m-0 max-w-[22ch] [font-family:var(--font-serif)] text-[clamp(2rem,5vw,4.2rem)] leading-[1.1] font-semibold">
              Leadership
            </h1>
            <p className="mt-6 mb-0 max-w-[65ch] text-[clamp(1.02rem,2.2vw,1.3rem)] text-[var(--ink-muted)]">
              Inspire Columbia is run entirely by current University of South Carolina students.
            </p>
          </div>
        </section>

        <section className="relative h-[45vh] w-full overflow-hidden">
          <Image
            src="/pictures/tedx-team-lineup-applause.jpg"
            alt="The full Inspire Columbia team applauding together on stage at TEDxCongaree Vista"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[center_25%]"
          />
        </section>

        <section className="bg-[var(--surface)] py-13 md:py-16">
          <div className="mx-auto w-full max-w-[1100px] px-6 md:px-8">
            <LeadershipSection
              title="Executive Leadership"
              description="Our executive team oversees the day-to-day operations and strategic initiatives of Inspire Columbia."
              people={executiveLeadership}
            />
          </div>
        </section>

        <section className="bg-[var(--surface-blue)] py-13 md:py-16">
          <div className="mx-auto w-full max-w-[1100px] px-6 md:px-8">
            <LeadershipSection
              title="Board of Directors"
              description="Our board guides the strategic direction of the organization and is responsible for ensuring we fulfill our mission."
              people={boardOfDirectors}
            />
          </div>
        </section>
      </main>
    </>
  );
}
