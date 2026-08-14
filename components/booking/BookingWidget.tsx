"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Label, Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  formatPrice,
  formatDuration,
  type OpeningHours,
} from "@/types/database";
import { getBookedRanges, createBooking } from "@/lib/actions/appointments";
import { generateAvailableSlots } from "@/lib/slots";

type PublicBookingService = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  duration_minutes: number;
  sort_order: number;
};

function getTodayInTimeZone(timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
}

function addCalendarDays(dateISO: string, days: number): string {
  const [year, month, day] = dateISO.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatBusinessTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatBusinessDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function BookingWidget({
  businessId,
  businessSlug,
  services,
  openingHours,
  timeZone,
}: {
  businessId: string;
  businessSlug: string;
  services: PublicBookingService[];
  openingHours: OpeningHours;
  timeZone: string;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [serviceId, setServiceId] = useState<string>(services[0]?.id ?? "");
  const [dateISO, setDateISO] = useState<string>(() => getTodayInTimeZone(timeZone));
  const [slots, setSlots] = useState<Date[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const service = useMemo(
    () => services.find((s) => s.id === serviceId),
    [services, serviceId]
  );

  const minDate = useMemo(() => getTodayInTimeZone(timeZone), [timeZone]);
  const maxDate = useMemo(() => addCalendarDays(minDate, 60), [minDate]);

  useEffect(() => {
    if (!service) return;

    let cancelled = false;
    setLoadingSlots(true);
    setSelectedSlot(null);
    setError(null);

    getBookedRanges(businessId, dateISO).then((ranges) => {
      if (cancelled) return;

      const availableSlots = generateAvailableSlots(
        dateISO,
        openingHours,
        service.duration_minutes,
        ranges,
        timeZone
      );

      setSlots(availableSlots);
      setLoadingSlots(false);
    });

    return () => {
      cancelled = true;
    };
  }, [businessId, dateISO, service, openingHours, timeZone]);

  if (success) {
    return (
      <Card className="p-8 text-center">
        <p className="font-display text-xl text-ink">Booking requested</p>
        <p className="mt-2 text-sm text-ink2">
          We've sent your request to the business. You'll hear back to confirm your appointment.
        </p>
      </Card>
    );
  }

  if (services.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-ink2">
        This business hasn't added any bookable services yet.
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-6 flex items-center gap-2 text-xs font-mono text-ink2">
        <span className={step >= 1 ? "text-ledger" : ""}>1. Service</span>
        <span>—</span>
        <span className={step >= 2 ? "text-ledger" : ""}>2. Time</span>
        <span>—</span>
        <span className={step >= 3 ? "text-ledger" : ""}>3. Your details</span>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <Label htmlFor="service">Choose a service</Label>
          <div className="space-y-2">
            {services.map((s) => (
              <label
                key={s.id}
                className={
                  "flex cursor-pointer items-center justify-between rounded-md border px-4 py-3 text-sm " +
                  (serviceId === s.id
                    ? "border-ledger bg-ledger/5"
                    : "border-line hover:border-ink/30")
                }
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="service"
                    checked={serviceId === s.id}
                    onChange={() => setServiceId(s.id)}
                  />
                  <span>
                    <span className="block font-medium text-ink">{s.name}</span>
                    <span className="text-xs text-ink2">{formatDuration(s.duration_minutes)}</span>
                  </span>
                </span>
                <span className="font-mono text-ink">{formatPrice(s.price_cents)}</span>
              </label>
            ))}
          </div>
          <Button className="w-full" onClick={() => setStep(2)} disabled={!serviceId}>
            Continue
          </Button>
        </div>
      )}

      {step === 2 && service && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="date">Choose a date</Label>
            <Input
              id="date"
              type="date"
              min={minDate}
              max={maxDate}
              value={dateISO}
              onChange={(e) => setDateISO(e.target.value)}
            />
          </div>

          <div>
            <Label>Available times</Label>
            <p className="mt-1 text-xs text-ink2">
              Times shown in the business timezone: {timeZone}
            </p>
            {loadingSlots ? (
              <p className="mt-3 text-sm text-ink2">Loading available times…</p>
            ) : slots.length === 0 ? (
              <p className="mt-3 text-sm text-ink2">No times available this day. Try another date.</p>
            ) : (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((slot) => (
                  <button
                    key={slot.toISOString()}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={
                      "rounded-md border px-2 py-2 font-mono text-sm " +
                      (selectedSlot?.getTime() === slot.getTime()
                        ? "border-ink bg-ink text-paper"
                        : "border-line text-ink hover:border-ink/40")
                    }
                  >
                    {formatBusinessTime(slot, timeZone)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              className="flex-1"
              disabled={!selectedSlot}
              onClick={() => setStep(3)}
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 3 && service && selectedSlot && (
        <form
          action={(fd) =>
            startTransition(async () => {
              setError(null);
              fd.set("businessId", businessId);
              fd.set("businessSlug", businessSlug);
              fd.set("serviceId", service.id);
              fd.set("startsAt", selectedSlot.toISOString());

              const res = await createBooking(fd);

              if (res.error) {
                setError(res.error);
              } else {
                setSuccess(true);
              }
            })
          }
          className="space-y-4"
          noValidate
        >
          <div className="rounded-md bg-ink/5 px-4 py-3 text-sm text-ink2">
            <p className="font-medium text-ink">{service.name}</p>
            <p>
              {formatBusinessDate(selectedSlot, timeZone)} at {formatBusinessTime(selectedSlot, timeZone)}
            </p>
            <p className="mt-1 text-xs text-ink2">Business timezone: {timeZone}</p>
          </div>

          <div>
            <Label htmlFor="customerName">Full name</Label>
            <Input id="customerName" name="customerName" required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="customerEmail">Email</Label>
              <Input id="customerEmail" name="customerEmail" type="email" required />
            </div>
            <div>
              <Label htmlFor="customerPhone">Phone (optional)</Label>
              <Input id="customerPhone" name="customerPhone" type="tel" />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>

          <input
            type="text"
            name="_hp_website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute left-[-9999px] h-0 w-0 opacity-0"
          />

          {error && <p role="alert" className="text-sm text-danger">{error}</p>}

          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending ? "Booking…" : "Confirm booking"}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
