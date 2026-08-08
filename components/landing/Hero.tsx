import { LinkButton } from "@/components/ui/Button";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="container-page grid gap-12 py-20 md:grid-cols-2 md:items-center md:py-28">
        <div className="animate-fadeUp">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-ledger">
            For barbers, salons, gyms, cafés &amp; trades
          </p>
          <h1 className="font-display text-4xl leading-[1.08] text-ink sm:text-5xl">
            Everything your local business needs, in one place.
          </h1>
          <p className="mt-5 max-w-md text-lg text-ink2">
            Manage your website, services, bookings and business information
            from one simple dashboard.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <LinkButton href="/signup" size="lg">Start Free</LinkButton>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-ink2 underline decoration-line underline-offset-4 hover:text-ink"
            >
              See how it works
            </a>
          </div>
          <p className="mt-6 text-xs text-ink2">No credit card required · Free plan available</p>
        </div>

        <div className="relative animate-fadeUp [animation-delay:120ms]">
          <div className="ledger-rule rounded-card border border-line bg-white p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
              <span className="font-display text-sm text-ink">Today — Blade Barber</span>
              <span className="font-mono text-xs text-ledger">8 bookings</span>
            </div>
            <ul className="space-y-0 text-sm">
              {[
                { t: "10:00", n: "John", s: "Haircut" },
                { t: "11:30", n: "Alex", s: "Beard Trim" },
                { t: "14:00", n: "Sarah", s: "Haircut + Beard" },
              ].map((row) => (
                <li key={row.t} className="flex items-center justify-between py-[6px]">
                  <span className="font-mono text-ink2">{row.t}</span>
                  <span className="text-ink">{row.n}</span>
                  <span className="text-ink2">{row.s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="absolute -right-4 -top-4 -z-10 h-full w-full rounded-card border border-brass/30 sm:-right-6 sm:-top-6" />
        </div>
      </div>
    </section>
  );
}
