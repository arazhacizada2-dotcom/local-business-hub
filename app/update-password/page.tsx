import { updatePassword } from "@/lib/actions/auth";
import { UpdatePasswordForm } from "@/components/onboarding/UpdatePasswordForm";
import Link from "next/link";

export default function UpdatePasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display text-lg text-ink">Local Business Hub</Link>
        <h1 className="mt-8 font-display text-2xl text-ink">Set new password</h1>
        <div className="mt-8">
          <UpdatePasswordForm action={updatePassword} />
        </div>
      </div>
    </main>
  );
}
