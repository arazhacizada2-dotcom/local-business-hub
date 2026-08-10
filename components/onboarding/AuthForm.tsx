"use client";

import { useState, useTransition } from "react";
import { Label, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { AuthResult } from "@/lib/actions/auth";

export function LoginForm({
  action,
}: {
  action: (fd: FormData) => Promise<AuthResult>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setError(null);

          try {
            const res = await action(fd);

            if (res?.error) {
              setError(res.error);
            }
          } catch {
            setError("Something went wrong. Please try again.");
          }
        })
      }
      className="space-y-5"
      noValidate
    >
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={pending}
      >
        {pending ? "Signing in…" : "Log in"}
      </Button>
    </form>
  );
}

export function SignupForm({
  action,
}: {
  action: (fd: FormData) => Promise<AuthResult>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setError(null);
          setSuccess(null);

          try {
            const res = await action(fd);

            if (res?.error) {
              setError(res.error);
              return;
            }

            if (res?.requiresConfirmation) {
              setSuccess(
                res.message ||
                  "Please check your email to confirm your account."
              );
              return;
            }
          } catch {
            setError("Something went wrong. Please try again.");
          }
        })
      }
      className="space-y-5"
      noValidate
    >
      <div>
        <Label htmlFor="fullName">Your name</Label>
        <Input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          required
        />
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <p className="mt-1 text-xs text-ink2">
          At least 8 characters.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          className="rounded-md bg-ledger/10 px-4 py-3 text-sm text-ledgerDark"
        >
          {success}
        </p>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={pending}
      >
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}

export function ForgotPasswordForm({
  action,
}: {
  action: (fd: FormData) => Promise<AuthResult>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  if (sent) {
    return (
      <p className="rounded-md bg-ledger/10 px-4 py-3 text-sm text-ledgerDark">
        If an account exists for that email, we've sent a password reset link.
      </p>
    );
  }

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setError(null);

          try {
            const res = await action(fd);

            if (res?.error) {
              setError(res.error);
            } else {
              setSent(true);
            }
          } catch {
            setError("Something went wrong. Please try again.");
          }
        })
      }
      className="space-y-5"
      noValidate
    >
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={pending}
      >
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
