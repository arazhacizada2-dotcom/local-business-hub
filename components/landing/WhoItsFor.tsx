const types = [
  "Barbers", "Hair salons", "Nail salons", "Gyms", "Fitness studios",
  "Restaurants", "Cafés", "Plumbers", "Painters", "Roofers",
];

export function WhoItsFor() {
  return (
    <section className="border-b border-line py-20">
      <div className="container-page">
        <h2 className="font-display text-3xl text-ink">Who it's for</h2>
        <p className="mt-3 max-w-xl text-ink2">
          Any local business that books appointments or takes enquiries by phone
          today can move that work online in an afternoon.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          {types.map((t) => (
            <span
              key={t}
              className="rounded-full border border-line bg-white px-4 py-2 text-sm text-ink2"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
