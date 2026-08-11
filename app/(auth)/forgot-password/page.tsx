import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/auth";
import { ForgotPasswordForm } from "@/components/onboarding/AuthForm";

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const invalidOrExpiredLink = searchParams.error === "invalid_or_expired_link";

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display text-lg text-ink">Local Business Hub</Link>
        <h1 className="mt-8 font-display text-2xl text-ink">Reset your password</h1>
        <p className="mt-1 text-sm text-ink2">
          Enter your email and we'll send you a reset link.
        </p>
        {invalidOrExpiredLink && (
          <p
            role="alert"
            className="mt-6 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            This password reset link is invalid or has expired. Please request a new one.
          </p>
        )}
        <div className="mt-8">
          <ForgotPasswordForm action={requestPasswordReset} />
        </div>
        <p className="mt-6 text-sm text-ink2">
          <Link href="/login" className="font-medium text-ledger hover:text-ledgerDark">Back to log in</Link>
        </p>
      </div>
    </main>
  );
}
