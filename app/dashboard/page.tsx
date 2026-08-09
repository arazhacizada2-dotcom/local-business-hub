export default async function DashboardOverviewPage() {
  const supabase = createClient();

  // ...

  const now = new Date();
  const todayStart = startOfDay(now).toISOString();
  const todayEnd = endOfDay(now).toISOString();

  // BURADA
  const [todaysAppts, upcoming, todaysViews, newBookings, totalServices] =
    await Promise.all([
      // queries...
    ]);

  // BURADA
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

  const hour = now.getHours();

  // ...

  return (
    <div>
      {/* dashboard */}
    </div>
  );
}
