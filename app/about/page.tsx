import Image from "next/image";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";

const boardMembers = [
  {
    name: "Luke Jannazzo",
    title: "President",
    bio: "Luke is a student at the Univeristy of South Carolina and previously served as the Event Manager of TEDxCongaree Vista.",
    headshot: "/headshots/luke.jpg",
  },
  {
    name: "Darssan Eswaramoorthi",
    title: "Secretary",
    bio: "Darssan is a Computer Engineering student at the University of South Carolina and previously served as Executive Producer of TEDxCongaree Vista.",
    headshot: "/headshots/darssan.jpg",
  },
  {
    name: "Sai Varun Nallu",
    title: "Treasurer",
    bio: "Sai is a Neuroscience student at the University of South Carolina and previously served as Sponsorships & Budget Director of TEDxCongaree Vista.",
    headshot: "/headshots/sai.jpg",
  },
  {
    name: "Owen Coulam",
    title: "Board Member",
    bio: "Owen is a Computer Science and Mathematics student at the University of South Carolina and previously served as Curation Director of TEDxCongaree Vista.",
    headshot: "/headshots/owen.jpg",
  },
  {
    name: "Shyam Ganesh Babu",
    title: "Board Member",
    bio: "Shyam is a Biological Sciences student at the University of South Carolina who previously served as the Lead Organizer of TEDxCongaree Vista.",
    headshot: "/headshots/shyam.jpg",
  }
];

export default function AboutPage() {
  return (
    <>
      <SiteHeader currentPath="/about" />
      <main className="text-[var(--ink)]">
        <section className="bg-[rgba(220,236,255,0.55)] py-14 md:py-[4.5rem]">
          <div className="mx-auto w-full max-w-[1100px] px-6 md:px-8">
            <h1 className="m-0 max-w-[22ch] [font-family:var(--font-serif)] text-[clamp(2rem,5vw,4.2rem)] leading-[1.1] font-semibold">
              About Inspire Columbia
            </h1>
            <p className="mt-6 mb-0 max-w-[65ch] text-[clamp(1.02rem,2.2vw,1.3rem)] text-[var(--ink-muted)]">
              Inspire Columbia Inc. is a 501(c)(3) nonprofit organization led by students and
              community members in Columbia, South Carolina. We produce leadership events,
              community workshops, and civic programming that brings people together around
              positive change.
            </p>
          </div>
        </section>

        <section className="bg-[rgba(255,255,255,0.55)] py-13 md:py-16">
          <div className="mx-auto w-full max-w-[1100px] px-6 md:px-8">
            <h2 className="mb-2 mt-0 [font-family:var(--font-serif)] text-[clamp(1.55rem,3vw,2.3rem)] font-semibold">
              Board of Directors
            </h2>
            <p className="mb-10 max-w-[60ch] text-[1.1rem] text-[var(--ink-muted)]">
              Our board guides the strategic direction of the organization and is responsible
              for ensuring we fulfill our mission.
            </p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {boardMembers.map((member) => (
                <div
                  key={member.name + member.title}
                  className="border border-[var(--line)] bg-[rgba(255,255,255,0.7)] p-6"
                >
                  {member.headshot ? (
                    <Image
                      src={member.headshot}
                      alt={member.name}
                      width={80}
                      height={80}
                      className="mb-4 h-20 w-20 rounded-full object-cover object-top"
                    />
                  ) : (
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-[var(--line)] bg-[var(--surface-strong)] text-[0.6rem] font-bold uppercase tracking-widest text-[var(--ink-muted)]">
                      Photo
                    </div>
                  )}
                  <p className="m-0 text-[1.15rem] font-bold">{member.name}</p>
                  <p className="mb-3 mt-0.5 text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
                    {member.title}
                  </p>
                  <p className="m-0 text-[0.95rem] text-[var(--ink-muted)]">{member.bio}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
