import Image from "next/image";
import Footer from "../components/Footer";
import SiteHeader from "../components/SiteHeader";

export default function Home() {
  return (
    <>
      <SiteHeader currentPath="/" />
      <main className="text-[var(--ink)]">
        <section className="bg-[rgba(220,236,255,0.55)] py-14 md:py-[4.5rem]">
          <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-6 md:px-8">
            <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[minmax(0,1fr)_minmax(210px,330px)]">
              <h1 className="m-0 max-w-[18ch] [font-family:var(--font-serif)] text-[clamp(2rem,5vw,4.2rem)] leading-[1.1] font-semibold">
                Events and opportunities that inspire positive change.
              </h1>
              <div className="flex justify-start md:justify-end">
                <Image
                  src="/InspireBlackLogo.png"
                  alt="Inspire Columbia logo"
                  width={840}
                  height={840}
                  className="mt-0 h-auto w-full max-w-[220px] md:-mt-1 md:max-w-[300px]"
                  priority
                />
              </div>
            </div>
            <p className="m-0 text-[clamp(1.02rem,2.2vw,1.3rem)] text-[var(--ink-muted)]">
              Inspire Columbia (formerly known as ChangeMakers Events) is a 501(c)(3) nonprofit that connects students, families, and
              local leaders through meaningful programs in Columbia, South Carolina.
            </p>
          </div>
        </section>

        <section className="bg-[rgba(255,255,255,0.55)] py-13 md:py-16" id="events">
          <div className="mx-auto w-full max-w-[1100px] px-6 md:px-8">
            <h2 className="mb-4 mt-0 [font-family:var(--font-serif)] text-[clamp(1.55rem,3vw,2.3rem)] font-semibold">
              Our Events
            </h2>
            <p className="mb-5 text-[1.15rem]">
              We are youth-powered and forward focused, bringing together the next generation of students and community leaders
              who work tirelessly to highlight the changemakers of Columbia that are building the future today. Our team dedicates time, energy,
              and creativity to build platforms that bring people together through the power of change.
            </p>
            <p className="mb-8 text-[1.15rem]">
              We partner with volunteers, educators, and local organizations to produce events that
              are accessible, informative, and action-oriented for attendees of all ages.
              Funds raised through sponsorships and ticket sales stay right here in the local community, helping cover essential
              costs like printing, signage, promotion, audio/visual needs, food, and venue expenses for our educational events.
            </p>
            <div className="mt-6 border-t border-[var(--line)] pt-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="border border-[var(--line)] bg-[rgba(255,255,255,0.7)] p-6 flex flex-col gap-4 rounded-lg shadow-sm transition-all duration-150 hover:-translate-y-2 hover:shadow-md">
                  <Image
                    src="/tedxcv.png"
                    alt="TEDxCongaree Vista logo"
                    width={1400}
                    height={504}
                    className="block h-auto w-full max-w-[340px]"
                  />
                  <p className="m-0 text-[1.05rem]">
                    <strong>March 14th, 2026</strong><br /><br />
                    TEDxCongaree Vista is the flagship production of Inspire Columbia, and is the
                    first standard TEDx event in Columbia for over 10 years.
                  </p>
                  <a
                    className="inline-block self-start rounded-lg border-2 border-[var(--brand)] bg-white px-6 py-3 font-bold text-[var(--brand)] no-underline shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#eef2ff] hover:shadow-md active:translate-y-px active:shadow-sm"
                    href="https://tedxcongareevista.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Visit Event Website
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[rgba(200,224,255,0.5)] py-13 md:py-16" id="recruitment">
          <div className="mx-auto w-full max-w-[1100px] px-6 md:px-8">
            <h2 className="mb-4 mt-0 [font-family:var(--font-serif)] text-[clamp(1.55rem,3vw,2.3rem)] font-semibold">
              2026 Associate Recruitment
            </h2>
            <p className="mb-5 text-[1.15rem]">
              We are preparing the next recruitment cycle for associates who want to help to early valuable leadership skills,
               support community outreach, and contribute to our mission-driven programming.
            </p>
            <p className="mb-5 text-[1.15rem]">
              Our application opens in May, and it is open to all students in the Columbia, South Carolina area. 
              If you are interested in learning more, please join our interest list to receive updates about the application process and upcoming events.
            </p>
            <a
              className="inline-block rounded-lg border-2 border-transparent bg-[var(--brand)] px-6 py-3 font-bold text-white no-underline shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[var(--brand-hover)] hover:shadow-md active:translate-y-px active:shadow-sm"
              href="https://forms.gle/PCvBcX8hAV6hnCFL7"
              target="_blank"
              rel="noopener noreferrer"
            >
              Join the Interest List
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
