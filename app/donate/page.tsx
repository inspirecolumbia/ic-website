import Footer from "@/components/Footer";
import SiteHeader from "../../components/SiteHeader";

export default function DonationsPage() {
  return (
    <>
      <SiteHeader currentPath="/donate" />
      <main className="text-[var(--ink)]">
        <section className="min-h-[calc(100vh-76px)] bg-[rgba(220,236,255,0.55)] py-14 md:py-[4.5rem]">
          <div className="mx-auto w-full max-w-[1100px] px-6 md:px-8">
            <p className="m-0 text-[0.9rem] font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
              Support Our Mission
            </p>
            <h1 className="mb-4 mt-4 max-w-[18ch] font-[var(--font-serif)] text-[clamp(2rem,5vw,4.2rem)] leading-[1.1] font-semibold">
              Help us fund community-first programming.
            </h1>
            <p className="mb-5 max-w-[65ch] text-[clamp(1.02rem,2.2vw,1.3rem)] text-[var(--ink-muted)]">
              Your contribution helps us host local events, expand youth leadership opportunities,
              and keep programs accessible to everyone.
            </p>
            <a
              className="mt-6 inline-block border-2 border-transparent bg-[var(--brand)] px-6 py-3 font-bold text-white no-underline hover:bg-[var(--brand-hover)] focus-visible:bg-[var(--brand-hover)]"
              href="https://www.zeffy.com/en-US/donation-form/support-events-that-inspire-in-columbia-sc"
              target="_blank"
              rel="noopener noreferrer"
            >
              Donate via Zeffy
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
