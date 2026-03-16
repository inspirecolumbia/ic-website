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
                  src="/cm_logo_transparent.png"
                  alt="Inspire Columbia logo"
                  width={840}
                  height={840}
                  className="mt-0 h-auto w-full max-w-[220px] md:-mt-1 md:max-w-[300px]"
                  priority
                />
              </div>
            </div>
            <p className="m-0 max-w-[65ch] text-[clamp(1.02rem,2.2vw,1.3rem)] text-[var(--ink-muted)]">
              Inspire Columbia Inc. is a 501(c)(3) nonprofit that connects students, families, and
              local leaders through meaningful programs in Columbia, South Carolina.
            </p>
          </div>
        </section>

        <section className="bg-[rgba(255,255,255,0.55)] py-13 md:py-16" id="events">
          <div className="mx-auto w-full max-w-[1100px] px-6 md:px-8">
            <h2 className="mb-4 mt-0 [font-family:var(--font-serif)] text-[clamp(1.55rem,3vw,2.3rem)] font-semibold">
              Our Events
            </h2>
            <p className="mb-5 max-w-[70ch] text-[1.15rem]">
              We are a youth-led organization that works to produce leadership panels, community workshops, and public storytelling
              events designed to bring people together around civic engagement.
            </p>
            <p className="mb-8 max-w-[70ch] text-[1.15rem]">
              We partner with volunteers, educators, and local organizations to produce events that
              are accessible, informative, and action-oriented for attendees of all ages.
            </p>
            <div className="mt-6 mb-10 border-t border-[var(--line)] pt-6">
              <Image
                src="/tedxcv.png"
                alt="TEDxCongaree Vista logo"
                width={1400}
                height={504}
                className="mb-10 block h-auto w-[440px] md:w-[620px]"
              />
              <p className="ml-4 mb-4 max-w-[55ch] text-[1.15rem]">
                <strong>March 14th, 2026</strong>
                <br />
                <br />
                TEDxCongaree Vista is the flagship production of Inspire Columbia, and is the
                first standard TEDx event in Columbia for over 10 years.
              </p>
              <a
                className="inline-block border-2 border-[var(--brand)] bg-white px-6 py-3 font-bold text-[var(--brand)] no-underline hover:bg-[#eef2ff] focus-visible:bg-[#eef2ff]"
                href= "https://tedxcongareevista.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit Event Website
              </a>
            </div>
          </div>
        </section>

        <section className="bg-[rgba(200,224,255,0.5)] py-13 md:py-16" id="recruitment">
          <div className="mx-auto w-full max-w-[1100px] px-6 md:px-8">
            <h2 className="mb-4 mt-0 [font-family:var(--font-serif)] text-[clamp(1.55rem,3vw,2.3rem)] font-semibold">
              2026 Associate Recruitment
            </h2>
            <p className="mb-5 max-w-[70ch] text-[1.15rem]">
              We are preparing the next recruitment cycle for associates who want to help to early valuable leadership skills,
               support community outreach, and contribute to our mission-driven programming.
            </p>
            <p className="mb-5 max-w-[70ch] text-[1.15rem]">
              Our application opens in May, and it is open to all students in the Columbia, South Carolina area. 
              If you are interested in learning more, please join our interest list to receive updates about the application process and upcoming events.
            </p>
            <a
              className="inline-block border-2 border-transparent bg-[var(--brand)] px-6 py-3 font-bold text-white no-underline hover:bg-[var(--brand-hover)] focus-visible:bg-[var(--brand-hover)]"
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
