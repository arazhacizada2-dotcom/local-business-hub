"use client";

import { useState, useTransition } from "react";
import { Label, Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { Service } from "@/types/database";
import type { ActionResult } from "@/lib/actions/services";

export function ServiceForm({
  service,
  onCreate,
  onUpdate,
  onDone,
}: {
  service?: Service;
  onCreate?: (fd: FormData) => Promise<ActionResult>;
  onUpdate?: (fd: FormData) => Promise<ActionResult>;
  onDone?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(service);

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setError(null);
          const action = isEdit ? onUpdate : onCreate;
          const res = await action?.(fd);
          if (res?.error) setError(res.error);
          else onDone?.();
        })
      }
      className="space-y-4"
      noValidate
    >
      {isEdit && <input type="hidden" name="serviceId" value={service!.id} />}
      <div>
        <Label htmlFor="name">Service name</Label>
        <Input id="name" name="name" required defaultValue={service?.name} placeholder="Haircut" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="price">Price (€)</Label>
          <Input
            id="price"
            name="price"
            type="number"
            min="0"
            step="0.5"
            required
            defaultValue={service ? service.price_cents / 100 : undefined}
          />
        </div>
        <div>
          <Label htmlFor="duration">Duration (min)</Label>
          <Input
            id="duration"
            name="duration"
            type="number"
            min="5"
            step="5"
            required
            defaultValue={service?.duration_minutes}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea id="description" name="description" rows={2} defaultValue={service?.description ?? ""} />
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Add service"}
        </Button>
        {onDone && (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
