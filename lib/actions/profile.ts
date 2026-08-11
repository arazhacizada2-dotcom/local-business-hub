"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ProfileActionResult {
  error?: string;
  success?: boolean;
}

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(100, "Name must be 100 characters or fewer.");

export async function updateUserProfile(formData: FormData): Promise<ProfileActionResult> {
  const fullNameResult = nameSchema.safeParse(String(formData.get("fullName") ?? ""));
  if (!fullNameResult.success) return { error: fullNameResult.error.issues[0]?.message ?? "Invalid name." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in to update your profile." };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullNameResult.data })
    .eq("id", user.id);

  if (error) return { error: "Could not update your profile. Please try again." };
  return { success: true };
}

const allowedAvatarTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export async function uploadAvatar(formData: FormData): Promise<ProfileActionResult> {
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image to upload." };
  if (file.size > MAX_AVATAR_BYTES) return { error: "Avatar must be 2 MB or smaller." };

  const extension = allowedAvatarTypes.get(file.type);
  if (!extension) return { error: "Avatar must be a JPG, PNG, or WebP image." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in to change your avatar." };

  // Keep one fixed object per user so changing formats cannot leave old avatar files behind.
  const avatarPath = `${user.id}/avatar`;
  const { error: uploadError } = await supabase.storage.from("avatars").upload(avatarPath, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: true,
  });
  if (uploadError) return { error: "Could not upload your avatar. Please try again." };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_path: avatarPath })
    .eq("id", user.id);

  if (profileError) {
    await supabase.storage.from("avatars").remove([avatarPath]);
    return { error: "Could not save your avatar. Please try again." };
  }

  return { success: true };
}

export async function deleteUserAccount(formData: FormData): Promise<ProfileActionResult> {
  if (String(formData.get("confirmation") ?? "") !== "DELETE") {
    return { error: "Type DELETE to confirm account deletion." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in to delete your account." };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) return { error: "Could not verify your profile. Please try again." };

  // Avatar objects are not relational rows, so remove the private object before
  // deleting auth.users. The database cascades auth.users -> profiles -> business data.
  if (profile?.avatar_path) {
    const { error: avatarError } = await supabase.storage.from("avatars").remove([profile.avatar_path]);
    if (avatarError) return { error: "Could not remove your avatar. Account deletion was not completed." };
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) return { error: "Could not delete your account. Please try again." };
  } catch {
    return { error: "Account deletion is not configured on the server." };
  }

  await supabase.auth.signOut({ scope: "local" });
  redirect("/?account_deleted=1");
}
