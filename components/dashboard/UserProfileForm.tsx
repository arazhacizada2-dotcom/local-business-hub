"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import {
  deleteUserAccount,
  updateUserProfile,
  uploadAvatar,
  type ProfileActionResult,
} from "@/lib/actions/profile";

export function UserProfileForm({
  fullName,
  email,
  avatarUrl,
}: {
  fullName: string;
  email: string;
  avatarUrl: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [avatarPending, startAvatarTransition] = useTransition();

  function submitProfile(formData: FormData) {
    startTransition(async () => {
      setError(null);
      setSaved(false);
      const result: ProfileActionResult = await updateUserProfile(formData);
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  function submitAvatar(formData: FormData) {
    startAvatarTransition(async () => {
      setError(null);
      const result = await uploadAvatar(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      window.location.reload();
    });
  }

  return (
    <div className="space-y-8">
      <form action={submitProfile} className="space-y-5" noValidate>
        <div>
          <Label htmlFor="fullName">Name</Label>
          <Input id="fullName" name="fullName" required maxLength={100} defaultValue={fullName} />
        </div>
        <div>
          <Label htmlFor="accountEmail">Email</Label>
          <Input id="accountEmail" name="accountEmail" type="email" value={email} readOnly disabled />
          <p className="mt-1.5 text-xs text-ink2">Your authentication email. This is separate from your business email.</p>
        </div>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {saved && <p className="text-sm text-ledger">Saved.</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </form>

      <div className="border-t border-line pt-6">
        <h3 className="font-display text-base text-ink">Avatar</h3>
        <p className="mt-1 text-sm text-ink2">JPG, PNG, or WebP, up to 2 MB.</p>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-line bg-ink/5 text-sm text-ink2">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Your avatar" className="h-full w-full object-cover" />
            ) : (
              "No photo"
            )}
          </div>
          <form action={submitAvatar} className="flex items-center gap-3">
            <Input
              id="avatar"
              name="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              className="max-w-xs px-2 py-2"
            />
            <Button type="submit" variant="secondary" disabled={avatarPending}>
              {avatarPending ? "Uploading…" : "Change avatar"}
            </Button>
          </form>
        </div>
      </div>

      <AccountDeletionSection />
    </div>
  );
}

function AccountDeletionSection() {
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="border-t border-line pt-6">
      <h3 className="font-display text-base text-ink">Delete account</h3>
      <p className="mt-1 text-sm text-ink2">
        This permanently deletes your account, profile, and data associated with your business.
        This action cannot be undone.
      </p>
      <form
        action={(formData) =>
          startTransition(async () => {
            setError(null);
            const result = await deleteUserAccount(formData);
            if (result.error) setError(result.error);
          })
        }
        className="mt-4 space-y-4"
      >
        <div>
          <Label htmlFor="deleteConfirmation">Type DELETE to confirm</Label>
          <Input
            id="deleteConfirmation"
            name="confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            required
          />
        </div>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <Button type="submit" variant="danger" disabled={pending || confirmation !== "DELETE"}>
          {pending ? "Deleting…" : "Delete account"}
        </Button>
      </form>
    </div>
  );
}
