import Link from "next/link";
import { signUp } from "@/lib/actions/auth";
import { SignupForm } from "@/components/onboarding/AuthForm";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display text-lg text-ink">Local Business Hub</Link>
        <h1 className="mt-8 font-display text-2xl text-ink">Start Free</h1>
        <p className="mt-1 text-sm text-ink2">Set up your business page in a few minutes.</p>
        <div className="mt-8">
          <SignupForm action={signUp} />
        </div>
        <p className="mt-6 text-sm text-ink2">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-ledger hover:text-ledgerDark">Log in</Link>
        </p>
      </div>
    </main>
  );
}
