import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import Link from "next/link";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export default async function DashboardOverviewPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) redirect("/onboarding");

  const now = new Date();
  const todayStart = startOfDay(now).toISOString();
  const todayEnd = endOfDay(now).toISOString();

  const [todaysAppts, upcoming, todaysViews, newBookings, totalServices] = await Promise.all([
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .neq("status", "cancelled")
      .gte("starts_at", todayStart)
      .lte("starts_at", todayEnd),
    supabase
      .from("appointments")
      .select("id, customer_name, starts_at, status, services(name)")
      .eq("business_id", business.id)
      .neq("status", "cancelled")
      .gte("starts_at", now.toISOString())
      .order("starts_at", { ascending: true })
      .limit(6),
    supabase
      .from("page_views")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("event_type", "page_view")
      .gte("created_at", todayStart)
      .lte("created_at", todayEnd),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("status", "pending"),
    supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id),
  ]);

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">
        {greeting}
        {business.name ? `, ${business.name}` : ""}
      </h1>
      <p className="mt-1 text-sm text-ink2">Here's what's happening today.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's bookings" value={todaysAppts.count ?? 0} />
        <StatCard label="Website visitors today" value={todaysViews.count ?? 0} />
        <StatCard label="New enquiries" value={newBookings.count ?? 0} hint="Pending confirmation" />
        <StatCard label="Active services" value={totalServices.count ?? 0} />
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">Upcoming appointments</h2>
          <Link href="/dashboard/appointments" className="text-sm font-medium text-ledger hover:text-ledgerDark">
            View all →
          </Link>
        </div>

        <Card className="mt-4 overflow-hidden">
          {!upcoming.data || upcoming.data.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-ink2">No upcoming appointments yet.</p>
              <Link href={`/dashboard/services`} className="mt-2 inline-block text-sm font-medium text-ledger">
                Add a service to start taking bookings →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {upcoming.data.map((appt: any) => (
                <li key={appt.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="flex items-center gap-4">
                    <span className="w-16 shrink-0 font-mono text-sm text-ink2">
                      {new Date(appt.starts_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-ink">{appt.customer_name}</p>
                      <p className="text-xs text-ink2">{appt.services?.name ?? "Service removed"}</p>
                    </div>
                  </div>
                  <StatusBadge status={appt.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
