import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ServiceList } from "@/components/dashboard/ServiceList";

export default async function ServicesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!business) redirect("/onboarding");

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("business_id", business.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return <ServiceList initialServices={services ?? []} />;
}
