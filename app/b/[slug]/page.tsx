import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  formatPrice,
  formatDuration,
  DAY_LABELS,
  DAY_ORDER,
} from "@/types/database";
import { BookingWidget } from "@/components/booking/BookingWidget";
import { trackPageView } from "@/lib/actions/appointments";
import Link from "next/link";

export const dynamic = "force-dynamic";

function getTodayForTimezone(timeZone: string) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone,
  }).format(new Date());

  const map: Record<string, keyof typeof DAY_LABELS> = {
    Sun: "sun",
    Mon: "mon",
    Tue: "tue",
    Wed: "wed",
    Thu: "thu",
    Fri: "fri",
    Sat: "sat",
  };

  return map[weekday] ?? "mon";
}

export default async function PublicBusinessPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!business) notFound();

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("business_id", business.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  // Track page view reliably before the serverless response finishes.
  await trackPageView(business.id);

  // Use the BUSINESS timezone, not the server/Vercel timezone.
  const businessTimeZone = business.timezone || "UTC";
  const today = getTodayForTimezone(businessTimeZone);

  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white">
        <div className="container-page flex items-center justify-between py-5">
          <Link
            href="/"
            className="font-display text-base text-ink"
          >
            Local Business Hub
          </Link>
        </div>
      </header>

      <section className="border-b border-line bg-white">
        <div className="container-page py-14">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ledger">
            {business.business_type}
          </p>

          <h1 className="mt-3 font-display text-4xl text-ink">
            {business.name}
          </h1>

          {business.description && (
            <p className="mt-4 max-w-xl text-ink2">
              {business.description}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink2">
            {business.address && (
              <span>📍 {business.address}</span>
            )}

            {business.phone && (
              <span>📞 {business.phone}</span>
            )}

            {business.email && (
              <span>✉️ {business.email}</span>
            )}
          </div>

          <a
            href="#book"
            className="mt-8 inline-flex items-center justify-center rounded-md bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-ledgerDark"
          >
            Book Appointment
          </a>
        </div>
      </section>

      <section className="container-page grid gap-10 py-14 lg:grid-cols-[1fr_380px]">
        <div>
          <h2 className="font-display text-2xl text-ink">
            Services
          </h2>

          {!services || services.length === 0 ? (
            <p className="mt-4 text-sm text-ink2">
              No services listed yet.
            </p>
          ) : (
            <div className="mt-6 divide-y divide-line border-t border-line">
              {services.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-6 py-4"
                >
                  <div>
                    <p className="font-medium text-ink">
                      {s.name}
                    </p>

                    {s.description && (
                      <p className="mt-1 text-sm text-ink2">
                        {s.description}
                      </p>
                    )}

                    <p className="mt-1 font-mono text-xs text-ink2">
                      {formatDuration(s.duration_minutes)}
                    </p>
                  </div>

                  <p className="shrink-0 font-mono text-ink">
                    {formatPrice(s.price_cents)}
                  </p>
                </div>
              ))}
            </div>
          )}

          <h2 className="mt-12 font-display text-2xl text-ink">
            Opening hours
          </h2>

          <div className="mt-6 max-w-xs divide-y divide-line border-t border-line font-mono text-sm">
            {DAY_ORDER.map((day) => {
              const hours = business.opening_hours[day];

              return (
                <div
                  key={day}
                  className={
                    "flex items-center justify-between py-2.5 " +
                    (day === today
                      ? "font-medium text-ink"
                      : "text-ink2")
                  }
                >
                  <span>{DAY_LABELS[day]}</span>

                  <span>
                    {hours.closed
                      ? "Closed"
                      : `${hours.open} – ${hours.close}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div
          id="book"
          className="lg:sticky lg:top-8 lg:self-start"
        >
          <h2 className="mb-4 font-display text-xl text-ink">
            Book an appointment
          </h2>

          <BookingWidget
            businessId={business.id}
            services={services ?? []}
            openingHours={business.opening_hours}
            timeZone={businessTimeZone}
          />
        </div>
      </section>
    </main>
  );
}
