"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { signOut } from "@/lib/actions/auth";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/appointments", label: "Appointments" },
  { href: "/dashboard/services", label: "Services" },
  { href: "/dashboard/settings", label: "Settings" },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={clsx(
              "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-ink text-paper" : "text-ink2 hover:bg-ink/5 hover:text-ink"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}

export function DesktopSidebar({ businessName, slug }: { businessName: string; slug: string }) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-white md:flex">
      <div className="border-b border-line p-5">
        <Link href="/dashboard" className="font-display text-lg text-ink">Local Business Hub</Link>
        <p className="mt-1 truncate text-xs text-ink2">{businessName}</p>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        <NavLinks />
      </nav>
      <div className="space-y-2 border-t border-line p-3">
        <Link
          href={`/b/${slug}`}
          target="_blank"
          className="block rounded-md px-3 py-2 text-sm font-medium text-ledger hover:bg-ledger/10"
        >
          View public page ↗
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-ink2 hover:bg-ink/5 hover:text-ink"
          >
            Log out
          </button>
        </form>
      </div>
    </aside>
  );
}

export function MobileNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  return (
    <>
      <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3 md:hidden">
        <Link href="/dashboard" className="font-display text-base text-ink">Local Business Hub</Link>
        <Link href={`/b/${slug}`} target="_blank" className="text-xs font-medium text-ledger">
          View page ↗
        </Link>
      </header>
      <nav className="flex overflow-x-auto border-b border-line bg-white px-2 md:hidden" aria-label="Dashboard">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium",
                active ? "border-ink text-ink" : "border-transparent text-ink2"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
