import { clsx } from "clsx";
import type { AppointmentStatus } from "@/types/database";

const statusStyles: Record<AppointmentStatus, string> = {
  pending: "bg-brass/15 text-brass",
  confirmed: "bg-ledger/12 text-ledger",
  completed: "bg-ink/10 text-ink2",
  cancelled: "bg-danger/10 text-danger",
};

const statusLabels: Record<AppointmentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        statusStyles[status]
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
