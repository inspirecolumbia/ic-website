import PersonCard from "@/components/PersonCard";
import type { Person } from "@/data/people";

type LeadershipSectionProps = {
  title: string;
  description?: string;
  people: Person[];
};

export default function LeadershipSection({ title, description, people }: LeadershipSectionProps) {
  return (
    <div>
      <h2 className="mt-0 mb-8 [font-family:var(--font-serif)] text-[clamp(1.55rem,3vw,2.3rem)] font-semibold text-[var(--ink)]">
        {title}
      </h2>
      {description && (
        <p className="mb-10 max-w-[60ch] text-[1.1rem] text-[var(--ink-muted)]">{description}</p>
      )}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {people.map((person) => (
          <PersonCard key={person.slug} person={person} />
        ))}
      </div>
    </div>
  );
}
