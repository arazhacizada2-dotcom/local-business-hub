import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { ProfileSettingsForm, OpeningHoursForm } from "@/components/dashboard/SettingsForm";
import { UserProfileForm } from "@/components/dashboard/UserProfileForm";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!business) redirect("/onboarding");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_path")
    .eq("id", user.id)
    .maybeSingle();

  let avatarUrl: string | null = null;
  if (profile?.avatar_path) {
    const { data } = await supabase.storage.from("avatars").createSignedUrl(profile.avatar_path, 3600);
    avatarUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl text-ink">Settings</h1>
      <p className="mt-1 text-sm text-ink2">
        Your public page is at{" "}
        <span className="font-mono text-ink">/b/{business.slug}</span>
      </p>

      <Card className="mt-6 p-6">
        <h2 className="mb-5 font-display text-lg text-ink">User profile</h2>
        <UserProfileForm
          fullName={profile?.full_name ?? user.user_metadata?.full_name ?? ""}
          email={user.email ?? ""}
          avatarUrl={avatarUrl}
        />
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="mb-5 font-display text-lg text-ink">Business profile</h2>
        <ProfileSettingsForm business={business} />
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="mb-5 font-display text-lg text-ink">Opening hours</h2>
        <OpeningHoursForm business={business} />
      </Card>
    </div>
  );
}
