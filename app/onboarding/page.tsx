import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { completeOnboarding } from "@/lib/actions/business";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";

export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: existingBusiness } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (existingBusiness) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-paper">
      <div className="container-page max-w-xl py-16">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-ledger">Step 1 of 1</p>
        <h1 className="mt-3 font-display text-3xl text-ink">Tell us about your business</h1>
        <p className="mt-2 text-ink2">
          This creates your dashboard and your public booking page. You can edit
          everything later from Settings.
        </p>
        <div className="mt-10">
          <OnboardingForm action={completeOnboarding} />
        </div>
      </div>
    </main>
  );
}
