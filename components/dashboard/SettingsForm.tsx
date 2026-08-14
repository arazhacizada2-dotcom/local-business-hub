"use client";

import { useState, useTransition } from "react";
import { Label, Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { Business, OpeningHours } from "@/types/database";
import { DAY_LABELS, DAY_ORDER } from "@/types/database";
import { updateBusinessProfile, updateOpeningHours, type ActionResult } from "@/lib/actions/business";

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

export function ProfileSettingsForm({ business }: { business: Business }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setError(null);
          setSaved(false);
          const res: ActionResult = await updateBusinessProfile(fd);
          if (res?.error) setError(res.error);
          else setSaved(true);
        })
      }
      className="space-y-5"
      noValidate
    >
      <input type="hidden" name="businessId" value={business.id} />
      <input type="hidden" name="slug" value={business.slug} />
      <div>
        <Label htmlFor="name">Business name</Label>
        <Input id="name" name="name" required defaultValue={business.name} />
      </div>
      <div>
        <Label htmlFor="businessType">Business type</Label>
        <Input id="businessType" name="businessType" required defaultValue={business.business_type} />
      </div>
      <div>
        <Label htmlFor="timezone">Business timezone</Label>
        <Input
          id="timezone"
          name="timezone"
          list="settings-business-timezones"
          required
          defaultValue={business.timezone}
          placeholder="Europe/Berlin"
        />
        <datalist id="settings-business-timezones">
          {COMMON_TIMEZONES.map((zone) => <option key={zone} value={zone} />)}
        </datalist>
        <p className="mt-1 text-xs text-ink2">
          IANA timezone used for opening hours, booking slots, and appointment display.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={business.phone ?? ""} />
        </div>
        <div>
          <Label htmlFor="email">Business email</Label>
          <Input id="email" name="email" type="email" defaultValue={business.email ?? ""} />
        </div>
      </div>
      <div>
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" defaultValue={business.address ?? ""} />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={3} defaultValue={business.description ?? ""} />
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {saved && <p className="text-sm text-ledger">Saved.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

export function OpeningHoursForm({ business }: { business: Business }) {
  const [hours, setHours] = useState<OpeningHours>(business.opening_hours);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(day: keyof OpeningHours, patch: Partial<OpeningHours[typeof day]>) {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  }

  return (
    <div className="space-y-4">
      {DAY_ORDER.map((day) => (
        <div key={day} className="flex flex-wrap items-center gap-3">
          <span className="w-28 shrink-0 text-sm font-medium text-ink">{DAY_LABELS[day]}</span>
          <label className="flex items-center gap-2 text-sm text-ink2">
            <input
              type="checkbox"
              checked={!hours[day].closed}
              onChange={(e) => update(day, { closed: !e.target.checked })}
            />
            Open
          </label>
          {!hours[day].closed && (
            <>
              <input
                type="time"
                value={hours[day].open}
                onChange={(e) => update(day, { open: e.target.value })}
                className="rounded-md border border-line px-2 py-1 text-sm"
              />
              <span className="text-ink2">–</span>
              <input
                type="time"
                value={hours[day].close}
                onChange={(e) => update(day, { close: e.target.value })}
                className="rounded-md border border-line px-2 py-1 text-sm"
              />
            </>
          )}
        </div>
      ))}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {saved && <p className="text-sm text-ledger">Saved.</p>}
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            setSaved(false);
            const res = await updateOpeningHours(business.id, hours);
            if (res?.error) setError(res.error);
            else setSaved(true);
          })
        }
      >
        {pending ? "Saving…" : "Save hours"}
      </Button>
    </div>
  );
}
