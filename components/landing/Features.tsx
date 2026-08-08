const features = [
  {
    title: "A real business website",
    body: "Every business gets a clean public page with services, prices, hours and a book button — no separate site builder needed.",
  },
  {
    title: "Online booking",
    body: "Customers pick a service, a date and an open time slot. Double-bookings are blocked automatically.",
  },
  {
    title: "One dashboard",
    body: "Today's appointments, new enquiries and website visits, at a glance, every morning.",
  },
  {
    title: "Services you control",
    body: "Add, price and time each service. Turn any of them off without deleting your history.",
  },
  {
    title: "Appointment management",
    body: "Confirm, cancel or mark a booking complete in one tap, from your phone or your laptop.",
  },
  {
    title: "Simple analytics",
    body: "See how many people viewed your page and how many of them actually booked.",
  },
];

export function Features() {
  return (
    <section id="features" className="border-b border-line py-20">
      <div className="container-page">
        <h2 className="font-display text-3xl text-ink">Built around how your day actually runs</h2>
        <p className="mt-3 max-w-xl text-ink2">
          No modules to configure, no features you'll never touch — just what a
          service business needs to take bookings and look professional online.
        </p>
        <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div key={f.title} className="border-t border-line pt-4">
              <span className="font-mono text-xs text-brass">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-2 font-display text-lg text-ink">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink2">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
