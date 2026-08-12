import Image from "next/image";
import type { Person } from "@/data/people";

type PersonCardProps = {
  person: Person;
};

export default function PersonCard({ person }: PersonCardProps) {
  return (
    <div className="flex w-full flex-col gap-4 rounded-[10px] border border-[var(--line)] bg-[var(--card-public)] p-6 transition-all duration-150 hover:border-[var(--brand)] hover:shadow-[0_8px_24px_rgba(29,78,216,0.12)]">
      <div className="flex flex-col items-center gap-4 text-center">
        {person.headshot ? (
          <Image
            src={person.headshot}
            alt={person.name}
            width={96}
            height={96}
            className="h-24 w-24 rounded-full object-cover object-top ring-1 ring-[var(--line)]"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-[var(--line)] bg-[var(--surface-strong)] text-[0.6rem] font-bold uppercase tracking-widest text-[var(--ink-muted)]">
            {person.placeholder ? "TBD" : "Photo"}
          </div>
        )}
        <div>
          <p className="m-0 text-[1.1rem] font-bold text-[var(--ink)]">{person.name}</p>
          <p className="mt-1 mb-0 text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
            {person.title}
          </p>
        </div>
      </div>
      <p className="m-0 border-t border-[var(--line)] pt-4 text-[0.95rem] text-[var(--ink-muted)]">
        {person.bio}
      </p>
    </div>
  );
}
