import Link from "next/link";
import Image from "next/image";

type SiteHeaderProps = {
  currentPath: "/" | "/about" | "/donate";
};

export default function SiteHeader({ currentPath }: SiteHeaderProps) {
  return (
    <header className="border-b border-[var(--line)] bg-[rgba(255,255,255,0.6)] backdrop-blur-sm">
      <div className="mx-auto flex min-h-[76px] w-full max-w-[1100px] items-center justify-between gap-8 px-6 md:px-8">
        <Link href="/" className="flex items-center no-underline">
          <Image
            src="/InspireBlack.png"
            alt="Inspire Columbia"
            height={36}
            width={180}
            className="h-9 w-auto"
            priority
          />
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
                href="/about"
                className={`inline-block border-b-2 px-0.5 py-1 text-base font-semibold no-underline ${
                  currentPath === "/about" ? "border-[var(--brand)]" : "border-transparent"
                }`}
              >
                About
              </Link>
            </li>
            <li>
              <Link
                href="/donate"
                className={`inline-block border-b-2 px-0.5 py-1 text-base font-semibold no-underline ${
                  currentPath === "/donate" ? "border-[var(--brand)]" : "border-transparent"
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
