import Link from "next/link";

type SiteHeaderProps = {
  currentPath: "/" | "/donations";
};

export default function SiteHeader({ currentPath }: SiteHeaderProps) {
  return (
    <header className="border-b border-[var(--line)] bg-white">
      <div className="mx-auto flex min-h-[76px] w-full max-w-[1100px] items-center justify-between gap-8 px-6 md:px-8">
        <Link
          href="/"
          className="text-[1.45rem] font-bold tracking-[0.01em] no-underline md:text-[1.35rem]"
        >
          Inspire Columbia
        </Link>
        <nav aria-label="Primary">
          <ul className="m-0 flex list-none gap-6 p-0 md:gap-4">
            <li>
              <Link
                href="/"
                className={`inline-block border-b-2 px-0.5 py-1 text-base font-semibold no-underline ${
                  currentPath === "/" ? "border-[var(--brand)]" : "border-transparent"
                }`}
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                href="/donations"
                className={`inline-block border-b-2 px-0.5 py-1 text-base font-semibold no-underline ${
                  currentPath === "/donations" ? "border-[var(--brand)]" : "border-transparent"
                }`}
              >
                Donate
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
