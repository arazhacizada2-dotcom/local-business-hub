import Link from "next/link";
import { confirmEmailOtp } from "@/lib/actions/auth";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { Button } from "@/components/ui/Button";

/**
 * Intermediate email confirmation page.
 *
 * GET only renders UI — no verifyOtp / session side effects — so Gmail and
 * other link scanners cannot consume the single-use token_hash.
 * The user must click "Confirm email", which POSTs to confirmEmailOtp.
 */
export default function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: {
    token_hash?: string;
    type?: string;
    next?: string;
  };
}) {
  const tokenHash = searchParams.token_hash ?? "";
  const type = searchParams.type ?? "email";
  const defaultNext = type === "recovery" ? "/update-password" : "/onboarding";
  const next = safeRedirectPath(searchParams.next, defaultNext);

  const isRecovery = type === "recovery";
  const missingParams = !tokenHash || !type;

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display text-lg text-ink">
          Local Business Hub
        </Link>

        {missingParams ? (
          <>
            <h1 className="mt-8 font-display text-2xl text-ink">
              Link incomplete
            </h1>
            <p className="mt-2 text-sm text-ink2">
              This confirmation link is missing required information. Request a
              new email and try again.
            </p>
            <p className="mt-6 text-sm text-ink2">
              <Link
                href={isRecovery ? "/forgot-password" : "/signup"}
                className="font-medium text-ledger hover:text-ledgerDark"
              >
                {isRecovery ? "Back to password reset" : "Back to sign up"}
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-8 font-display text-2xl text-ink">
              {isRecovery ? "Continue password reset" : "Confirm your email"}
            </h1>
            <p className="mt-2 text-sm text-ink2">
              {isRecovery
                ? "Click the button below to continue resetting your password."
                : "Click the button below to confirm your email address and finish creating your account."}
            </p>

            <form action={confirmEmailOtp} className="mt-8 space-y-5">
              <input type="hidden" name="token_hash" value={tokenHash} />
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="next" value={next} />
              <Button type="submit" className="w-full">
                {isRecovery ? "Continue" : "Confirm email"}
              </Button>
            </form>

            <p className="mt-6 text-sm text-ink2">
              <Link
                href={isRecovery ? "/forgot-password" : "/signup"}
                className="font-medium text-ledger hover:text-ledgerDark"
              >
                {isRecovery ? "Back to password reset" : "Back to sign up"}
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
