const [todaysAppts, upcoming, todaysViews, newBookings, totalServices] =
  await Promise.all([
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

// Error check BURADA, Promise.all DIŞINDA
if (
  todaysAppts.error ||
  upcoming.error ||
  todaysViews.error ||
  newBookings.error ||
  totalServices.error
) {
  throw new Error(
    todaysAppts.error?.message ||
      upcoming.error?.message ||
      todaysViews.error?.message ||
      newBookings.error?.message ||
      totalServices.error?.message ||
      "Failed to load dashboard data"
  );
}
