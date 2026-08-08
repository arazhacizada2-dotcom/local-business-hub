import { LinkButton } from "@/components/ui/Button";

export function CTA() {
  return (
    <section className="bg-ink py-20">
      <div className="container-page flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-3xl text-paper">Ready to move your business online?</h2>
          <p className="mt-2 text-paper/60">Set up your page in about ten minutes. It's free.</p>
        </div>
        <LinkButton href="/signup" size="lg" className="bg-paper text-ink hover:bg-paper/90 shrink-0">
          Start Free
        </LinkButton>
      </div>
    </section>
  );
}
