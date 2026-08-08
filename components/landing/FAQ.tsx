const faqs = [
  { q: "Do I need a credit card to start?", a: "No. Every account starts on the Free plan and you can use it without entering any payment details." },
  { q: "Can customers book without creating an account?", a: "Yes. Customers book from your public page with just their name, email and phone number." },
  { q: "Can I turn a service off without losing my history?", a: "Yes. Deactivating a service hides it from your booking page but keeps all past appointments." },
  { q: "Is my business data private?", a: "Yes. Only you can see your dashboard, appointments and analytics. Your public page only shows what you choose to publish." },
  { q: "When are paid plans available?", a: "Pro and Business plans are shown so you know what's coming, but billing isn't live yet — every account currently runs on Free." },
];

export function FAQ() {
  return (
    <section id="faq" className="border-b border-line py-20">
      <div className="container-page max-w-2xl">
        <h2 className="font-display text-3xl text-ink">Frequently asked questions</h2>
        <div className="mt-10 divide-y divide-line border-t border-line">
          {faqs.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-ink">
                {f.q}
                <span className="ml-4 text-ink2 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink2">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
