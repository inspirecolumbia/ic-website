import Image from "next/image";
import type { Person } from "@/data/people";

type PersonCardProps = {
  person: Person;
};

export default function PersonCard({ person }: PersonCardProps) {
  return (
    <div className="flex w-full flex-col items-start gap-4 rounded-[20px] border border-[var(--line)] bg-[var(--card-public)] p-6 transition-all duration-150 hover:border-[var(--brand)] hover:shadow-[0_8px_24px_rgba(29,78,216,0.12)] sm:flex-row sm:items-center sm:gap-6 sm:rounded-full sm:px-6 sm:py-4">
      {person.headshot ? (
        <Image
          src={person.headshot}
          alt={person.name}
          width={96}
          height={96}
          className="h-16 w-16 shrink-0 rounded-full object-cover object-top ring-1 ring-[var(--line)]"
        />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[var(--line)] bg-[var(--surface-strong)] text-[0.55rem] font-bold uppercase tracking-widest text-[var(--ink-muted)]">
          {person.placeholder ? "TBD" : "Photo"}
        </div>
      )}
      <div className="w-full shrink-0 sm:w-[260px]">
        <p className="m-0 text-[1.05rem] font-bold text-[var(--ink)]">{person.name}</p>
        <p className="mt-1 mb-0 text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
          {person.title}
        </p>
      </div>
      <p className="m-0 text-[0.95rem] text-[var(--ink-muted)] sm:flex-1 sm:border-l sm:border-[var(--line)] sm:pl-6">
        {person.bio}
      </p>
    </div>
  );
}
