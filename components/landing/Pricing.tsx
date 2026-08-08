import { LinkButton } from "@/components/ui/Button";

const plans = [
  {
    name: "Free",
    price: "€0",
    period: "/month",
    body: "Everything you need to get your first bookings online.",
    features: ["Public business page", "Up to 5 services", "Online booking", "Basic analytics"],
    cta: "Start Free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "€9",
    period: "/month",
    body: "For businesses ready to grow their booking volume.",
    features: ["Everything in Free", "Unlimited services", "Priority support", "Custom branding"],
    cta: "Start Free",
    highlighted: true,
  },
  {
    name: "Business",
    price: "€19",
    period: "/month",
    body: "For multi-location or higher-volume businesses.",
    features: ["Everything in Pro", "Multiple staff members", "Advanced analytics", "SMS reminders"],
    cta: "Start Free",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="border-b border-line bg-white py-20">
      <div className="container-page">
        <h2 className="font-display text-3xl text-ink">Simple pricing</h2>
        <p className="mt-3 max-w-xl text-ink2">
          Start free. Upgrade when you need more room. Paid plans are launching
          soon — for now, every account runs on the Free plan.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={
                "flex flex-col rounded-card border p-7 " +
                (p.highlighted ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink")
              }
            >
              <h3 className="font-display text-xl">{p.name}</h3>
              <p className={"mt-1 text-sm " + (p.highlighted ? "text-paper/70" : "text-ink2")}>
                {p.body}
              </p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-4xl">{p.price}</span>
                <span className={p.highlighted ? "text-paper/60" : "text-ink2"}>{p.period}</span>
              </div>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className={p.highlighted ? "text-brass" : "text-ledger"}>—</span>
                    {f}
                  </li>
                ))}
              </ul>
              <LinkButton
                href="/signup"
                variant={p.highlighted ? "secondary" : "primary"}
                className={"mt-8 " + (p.highlighted ? "border-paper/30 text-paper hover:bg-paper/10" : "")}
              >
                {p.cta}
              </LinkButton>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
