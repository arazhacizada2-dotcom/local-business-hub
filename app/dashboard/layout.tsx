import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DesktopSidebar, MobileNav } from "@/components/dashboard/DashboardNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, onboarding_complete")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business || !business.onboarding_complete) redirect("/onboarding");

  return (
    <div className="flex min-h-screen bg-paper">
      <DesktopSidebar businessName={business.name} slug={business.slug} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav slug={business.slug} />
        <main className="flex-1 p-5 md:p-10">{children}</main>
      </div>
    </div>
  );
}
