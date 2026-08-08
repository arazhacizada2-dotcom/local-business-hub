import Link from "next/link";
import { signIn } from "@/lib/actions/auth";
import { LoginForm } from "@/components/onboarding/AuthForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display text-lg text-ink">Local Business Hub</Link>
        <h1 className="mt-8 font-display text-2xl text-ink">Log in</h1>
        <p className="mt-1 text-sm text-ink2">Welcome back — manage your business.</p>
        <div className="mt-8">
          <LoginForm action={signIn} />
        </div>
        <div className="mt-6 flex items-center justify-between text-sm">
          <Link href="/forgot-password" className="text-ink2 hover:text-ink">Forgot password?</Link>
          <Link href="/signup" className="font-medium text-ledger hover:text-ledgerDark">Create account</Link>
        </div>
      </div>
    </main>
  );
}
