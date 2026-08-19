import type { Metadata } from "next";
import Image from "next/image";
import SiteHeader from "../../components/SiteHeader";

const leftImpactPhotos = [
  { src: "/pictures/tedx-team-lineup-applause.jpg", alt: "The Inspire Columbia team applauding together on stage at TEDxCongaree Vista" },
  { src: "/pictures/tedx-speaker-networking.jpg", alt: "A TEDxCongaree Vista speaker networking with attendees after their talk" },
  { src: "/pictures/tedx-staff-candid-coffee.jpg", alt: "Inspire Columbia staff sharing a candid moment over coffee" },
  { src: "/pictures/community-program-usc-group-photo.jpg", alt: "Students posing for a group photo inside a University of South Carolina meeting room" },
];

const rightImpactPhotos = [
  { src: "/pictures/tedx-organizers-on-stage.jpg", alt: "Three TEDxCongaree Vista organizers standing on stage in front of the event's title screen" },
  { src: "/pictures/tedx-team-on-stage-speaking.jpg", alt: "Inspire Columbia team members on stage, one speaking into a microphone" },
  { src: "/pictures/community-program-group-cityhall.jpg", alt: "Students posing together on the steps of Columbia City Hall during an Inspire Columbia summer program" },
  { src: "/pictures/community-program-cityhall-welcome.jpg", alt: "A speaker welcoming students inside a Columbia City Hall meeting room" },
];

export const metadata: Metadata = {
  title: "Donate",
  description: "Support Inspire Columbia's community events and youth leadership programs. 100% of your tax-deductible donation goes directly to our mission in Columbia, SC.",
  openGraph: {
    title: "Donate | Inspire Columbia",
    description: "Support Inspire Columbia's community events and youth leadership programs. 100% of your tax-deductible donation goes directly to our mission in Columbia, SC.",
    url: "https://inspirecolumbia.org/donate",
  },
  twitter: {
    title: "Donate | Inspire Columbia",
    description: "Support Inspire Columbia's community events and youth leadership programs. 100% of your tax-deductible donation goes directly to our mission in Columbia, SC.",
  },
};

export default function DonationsPage() {
  return (
    <>
      <SiteHeader currentPath="/donate" />
      <main className="text-[var(--ink)]">
        <section className="bg-[var(--surface-blue)] py-14 md:py-[4.5rem]">
          <div className="mx-auto w-full max-w-[1200px] px-6 md:px-8">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_minmax(0,2fr)_1fr] md:gap-16">
              <div className="hidden flex-col gap-4 md:flex">
                {leftImpactPhotos.map((photo) => (
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

              <div>
                <p className="m-0 text-[0.9rem] font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                  Support Our Mission
                </p>
                <h1 className="mb-4 mt-4 max-w-[18ch] [font-family:var(--font-serif)] text-[clamp(2rem,5vw,4.2rem)] leading-[1.1] font-semibold">
                  Help us fund community-first programming.
                </h1>
                <p className="mb-5 max-w-[65ch] text-[clamp(1.02rem,2.2vw,1.3rem)] text-[var(--ink-muted)]">
                  Your contribution helps us host local events, expand youth leadership opportunities,
                  and keep programs accessible to everyone.
                </p>
                <a
                  className="mt-6 inline-block rounded-full border-2 border-transparent bg-[var(--brand)] px-7 py-3.5 font-bold text-white no-underline transition-colors duration-150 hover:bg-[var(--brand-hover)]"
                  href="https://www.zeffy.com/en-US/donation-form/support-events-that-inspire-in-columbia-sc"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Donate via Zeffy
                </a>
                <p className="mt-10 mb-5 max-w-[65ch] text-[clamp(1.02rem,2.2vw,1.3rem)] text-[var(--ink-muted)]">
                  We use Zeffy for fee-free donations, ensuring that 100% of your donation makes it to us.
                  Zeffy may ask you to tip the payment processor, but this is optional and can be declined at checkout.
                  As a 501(c)3 nonprofit corporation, all donations to Inspire Columbia are fully tax-deductible.
                  <br />
                  <br />
                  If you have any questions about donating, or would like to explore other ways to support our work, please{" "}
                  <a
                    className="underline underline-offset-4"
                    href="mailto:info@inspirecolumbia.org"
                  >
                    contact us
                  </a>
                    .
                </p>
              </div>

              <div className="hidden flex-col gap-4 md:flex">
                {rightImpactPhotos.map((photo) => (
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
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
