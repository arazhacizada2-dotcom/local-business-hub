import Link from "next/link";
import { LinkButton } from "@/components/ui/Button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-paper/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="font-display text-lg tracking-tight text-ink">
          Local Business Hub
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-ink2 md:flex">
          <a href="#features" className="hover:text-ink">Features</a>
          <a href="#how-it-works" className="hover:text-ink">How it works</a>
          <a href="#pricing" className="hover:text-ink">Pricing</a>
          <a href="#faq" className="hover:text-ink">FAQ</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden text-sm font-medium text-ink2 hover:text-ink sm:block">
            Log in
          </Link>
          <LinkButton href="/signup" size="sm">Start Free</LinkButton>
        </div>
      </div>
    </header>
  );
}
