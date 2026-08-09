"use client";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <h2 className="font-display text-2xl text-ink">
          Something went wrong
        </h2>

        <p className="mt-2 text-sm text-ink2">
          We couldn't load your dashboard data.
        </p>

        <button
          onClick={() => reset()}
          className="mt-5 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
