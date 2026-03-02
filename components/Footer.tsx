export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--line)] bg-white">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-2 px-6 py-6 text-sm text-[var(--ink-muted)] md:flex-row md:items-center md:justify-between md:px-8">
        <p className="m-0">Copyright &copy; {year} Inspire Columbia Inc. All rights reserved.</p>
        <a
          href="mailto:info@inspirecolumbia.org"
          className="font-semibold text-[var(--brand)] no-underline hover:underline"
        >
          info@inspirecolumbia.org
        </a>
      </div>
    </footer>
  );
}
