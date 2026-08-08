import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppointmentList } from "@/components/dashboard/AppointmentList";

export default async function AppointmentsPage() {
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

  const { data: appointments } = await supabase
    .from("appointments")
    .select("*, services(name, price_cents)")
    .eq("business_id", business.id)
    .order("starts_at", { ascending: false })
    .limit(100);

  return <AppointmentList initialAppointments={appointments ?? []} />;
}
