"use client";

import { useState, useTransition } from "react";
import { Label, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { AuthResult } from "@/lib/actions/auth";

export function UpdatePasswordForm({ action }: { action: (fd: FormData) => Promise<AuthResult> }) {
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
      className="space-y-5"
      noValidate
    >
      <div>
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div>
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
