"use client";

import { useMemo, useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { formatPrice, type Appointment, type AppointmentStatus } from "@/types/database";
import { updateAppointmentStatus } from "@/lib/actions/appointments";

type ApptWithService = Appointment & { services: { name: string; price_cents: number } | null };

const FILTERS: { key: "upcoming" | "pending" | "all"; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "pending", label: "Needs confirmation" },
  { key: "all", label: "All" },
];

export function AppointmentList({ initialAppointments }: { initialAppointments: ApptWithService[] }) {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [filter, setFilter] = useState<"upcoming" | "pending" | "all">("upcoming");
  const [pendingId, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const now = Date.now();
    if (filter === "upcoming") {
      return appointments
        .filter((a) => new Date(a.starts_at).getTime() >= now && a.status !== "cancelled")
        .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
    }
    if (filter === "pending") return appointments.filter((a) => a.status === "pending");
    return appointments;
  }, [appointments, filter]);

  function applyStatus(id: string, status: AppointmentStatus) {
    startTransition(async () => {
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      await updateAppointmentStatus(id, status as "confirmed" | "cancelled" | "completed");
    });
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Appointments</h1>

      <div className="mt-5 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={
              "rounded-full border px-3.5 py-1.5 text-sm font-medium " +
              (filter === f.key
                ? "border-ink bg-ink text-paper"
                : "border-line bg-white text-ink2 hover:text-ink")
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="mt-6 p-10 text-center">
          <p className="text-sm text-ink2">No appointments here yet.</p>
        </Card>
      ) : (
        <Card className="mt-6 overflow-hidden">
          <ul className="divide-y divide-line">
            {filtered.map((a) => {
              const start = new Date(a.starts_at);
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="w-24 shrink-0 font-mono text-sm text-ink2">
                      <div>{start.toLocaleDateString([], { month: "short", day: "numeric" })}</div>
                      <div>{start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{a.customer_name}</p>
                      <p className="truncate text-xs text-ink2">
                        {a.services?.name ?? "Service removed"}
                        {a.services ? ` · ${formatPrice(a.services.price_cents)}` : ""}
                      </p>
                      <p className="truncate text-xs text-ink2">{a.customer_email}{a.customer_phone ? ` · ${a.customer_phone}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={a.status} />
                    <div className="flex gap-2">
                      {a.status === "pending" && (
                        <Button size="sm" onClick={() => applyStatus(a.id, "confirmed")} disabled={pendingId}>
                          Confirm
                        </Button>
                      )}
                      {(a.status === "pending" || a.status === "confirmed") && (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => applyStatus(a.id, "completed")}
                            disabled={pendingId}
                          >
                            Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => applyStatus(a.id, "cancelled")}
                            disabled={pendingId}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
