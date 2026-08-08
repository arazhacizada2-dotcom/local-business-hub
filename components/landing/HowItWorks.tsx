const steps = [
  { title: "Create your business profile", body: "Add your name, hours, address and a short description. Takes about three minutes." },
  { title: "Add your services", body: "List what you offer with prices and durations — a haircut, a class, a call-out." },
  { title: "Share your page", body: "You get a public link like localbusinesshub.com/b/your-business. Put it anywhere." },
  { title: "Take bookings", body: "Customers book straight from your page. You confirm or manage them from your dashboard." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-b border-line bg-white py-20">
      <div className="container-page">
        <h2 className="font-display text-3xl text-ink">How it works</h2>
        <div className="mt-12 grid gap-10 md:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.title}>
              <div className="font-display text-3xl text-ledger">{i + 1}</div>
              <h3 className="mt-3 font-medium text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink2">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
