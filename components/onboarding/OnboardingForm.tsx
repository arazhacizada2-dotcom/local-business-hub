"use client";

import { useState, useTransition } from "react";
import { Label, Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/business";

const BUSINESS_TYPES = [
  "Barber shop", "Hair salon", "Nail salon", "Gym", "Fitness studio",
  "Restaurant", "Cafe", "Plumber", "Painter", "Roofer", "Other",
];

export function OnboardingForm({ action }: { action: (fd: FormData) => Promise<ActionResult> }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
