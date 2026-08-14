"use client";

import { useEffect, useState, useTransition } from "react";
import { Label, Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/business";

const BUSINESS_TYPES = [
  "Barber shop", "Hair salon", "Nail salon", "Gym", "Fitness studio",
  "Restaurant", "Cafe", "Plumber", "Painter", "Roofer", "Other",
];

const COMMON_TIMEZONES = [
  "UTC",
  "Asia/Baku",
  "Europe/Berlin",
  "Europe/London",
  "Europe/Paris",
  "Europe/Vienna",
  "Europe/Moscow",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export function OnboardingForm({ action }: { action: (fd: FormData) => Promise<ActionResult> }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [timezone, setTimezone] = useState("UTC");

  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) setTimezone(detected);
    } catch {
      // Keep the safe UTC fallback when the runtime cannot report an IANA timezone.
    }
  }, []);

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setError(null);
          const res = await action(fd);
          if (res?.error) setError(res.error);
        })
      }
      className="space-y-6"
      noValidate
    >
      <div>
        <Label htmlFor="name">Business name</Label>
        <Input id="name" name="name" required placeholder="Blade Barber" />
      </div>

      <div>
        <Label htmlFor="businessType">Business type</Label>
        <select
          id="businessType"
          name="businessType"
          required
          className="w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ledger/30 focus:border-ledger"
        >
          <option value="">Select a type…</option>
          {BUSINESS_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="timezone">Business timezone</Label>
        <Input
          id="timezone"
          name="timezone"
          list="business-timezones"
          value={timezone}
          onChange={(event) => setTimezone(event.target.value)}
          required
          placeholder="Europe/Berlin"
        />
        <datalist id="business-timezones">
          {COMMON_TIMEZONES.map((zone) => <option key={zone} value={zone} />)}
        </datalist>
        <p className="mt-1 text-xs text-ink2">
          Use the business's IANA timezone, such as Europe/Berlin or Asia/Baku. Times are stored as real instants and displayed in this timezone.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" placeholder="+994 12 345 6789" />
        </div>
        <div>
          <Label htmlFor="email">Business email</Label>
          <Input id="email" name="email" type="email" placeholder="hello@yourbusiness.com" />
        </div>
      </div>

      <div>
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" placeholder="12 Main Street, Baku" />
      </div>

      <div>
        <Label htmlFor="description">Short description</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          placeholder="A friendly local barbershop with fast, sharp cuts."
        />
        <p className="mt-1 text-xs text-ink2">
          This appears on your public page. You can add a logo later from your dashboard.
        </p>
      </div>

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? "Creating your business…" : "Create my business page"}
      </Button>
    </form>
  );
}
