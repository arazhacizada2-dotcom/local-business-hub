import Link from "next/link";

export function Footer() {
  return (
    <footer className="py-10">
      <div className="container-page flex flex-col items-center justify-between gap-4 text-sm text-ink2 sm:flex-row">
        <span className="font-display text-ink">Local Business Hub</span>
        <span>© {new Date().getFullYear()} Local Business Hub. All rights reserved.</span>
        <Link href="/login" className="hover:text-ink">Log in</Link>
      </div>
    </footer>
  );
}
