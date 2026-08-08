"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ServiceForm } from "@/components/dashboard/ServiceForm";
import { formatPrice, formatDuration, type Service } from "@/types/database";
import {
  createService,
  updateService,
  toggleServiceActive,
  deleteService,
} from "@/lib/actions/services";

export function ServiceList({ initialServices }: { initialServices: Service[] }) {
  const [services, setServices] = useState(initialServices);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function refresh() {
    // Server actions revalidate the path; a soft reload keeps this simple
    // and reliable for an MVP without extra client-state plumbing.
    window.location.reload();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Services</h1>
        {!adding && (
          <Button onClick={() => setAdding(true)} size="sm">
            + Add service
          </Button>
        )}
      </div>

      {adding && (
        <Card className="mt-6 p-6">
          <h2 className="mb-4 font-display text-lg text-ink">New service</h2>
          <ServiceForm onCreate={createService} onDone={refresh} />
        </Card>
      )}

      {services.length === 0 && !adding ? (
        <Card className="mt-6 p-10 text-center">
          <p className="text-sm text-ink2">You haven't added any services yet.</p>
          <Button className="mt-4" size="sm" onClick={() => setAdding(true)}>
            Add your first service
          </Button>
        </Card>
      ) : (
        <div className="mt-6 space-y-3">
          {services.map((s) =>
            editingId === s.id ? (
              <Card key={s.id} className="p-6">
                <h2 className="mb-4 font-display text-lg text-ink">Edit service</h2>
                <ServiceForm service={s} onUpdate={updateService} onDone={refresh} />
              </Card>
            ) : (
              <Card key={s.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink">{s.name}</p>
                    {!s.is_active && (
                      <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs text-ink2">Inactive</span>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-sm text-ink2">
                    {formatPrice(s.price_cents)} · {formatDuration(s.duration_minutes)}
                  </p>
                  {s.description && <p className="mt-1 text-sm text-ink2">{s.description}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingId(s.id)}>
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await toggleServiceActive(s.id, !s.is_active);
                        setServices((prev) =>
                          prev.map((x) => (x.id === s.id ? { ...x, is_active: !x.is_active } : x))
                        );
                      })
                    }
                  >
                    {s.is_active ? "Deactivate" : "Activate"}
                  </Button>
                  {confirmDeleteId === s.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ink2">Delete?</span>
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            await deleteService(s.id);
                            setServices((prev) => prev.filter((x) => x.id !== s.id));
                            setConfirmDeleteId(null);
                          })
                        }
                      >
                        Confirm
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(s.id)}>
                      Delete
                    </Button>
                  )}
                </div>
              </Card>
            )
          )}
        </div>
      )}
    </div>
  );
}
