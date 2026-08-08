"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { OpeningHours } from "@/types/database";

export interface ActionResult {
  error?: string;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const DEFAULT_HOURS: OpeningHours = {
  mon: { open: "09:00", close: "18:00", closed: false },
  tue: { open: "09:00", close: "18:00", closed: false },
  wed: { open: "09:00", close: "18:00", closed: false },
  thu: { open: "09:00", close: "18:00", closed: false },
  fri: { open: "09:00", close: "18:00", closed: false },
  sat: { open: "10:00", close: "16:00", closed: false },
  sun: { open: "10:00", close: "16:00", closed: true },
};

export async function completeOnboarding(formData: FormData): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const name = String(formData.get("name") || "").trim();
  const businessType = String(formData.get("businessType") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const description = String(formData.get("description") || "").trim();

  if (!name || !businessType) {
    return { error: "Business name and type are required." };
  }

  const baseSlug = slugify(name) || "business";
  let slug = baseSlug;
  let attempt = 0;

  // Ensure slug uniqueness by appending a short suffix if needed.
  while (attempt < 5) {
    const { data: existing } = await supabase
      .from("businesses")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    attempt += 1;
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { error } = await supabase.from("businesses").insert({
    owner_id: user.id,
    slug,
    name,
    business_type: businessType,
    description: description || null,
    address: address || null,
    phone: phone || null,
    email: email || user.email || null,
    opening_hours: DEFAULT_HOURS,
    onboarding_complete: true,
  });

  if (error) return { error: error.message };

  redirect("/dashboard");
}

export async function updateBusinessProfile(formData: FormData): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const businessId = String(formData.get("businessId") || "");
  const name = String(formData.get("name") || "").trim();
  const businessType = String(formData.get("businessType") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const description = String(formData.get("description") || "").trim();

  if (!businessId || !name || !businessType) {
    return { error: "Business name and type are required." };
  }

  const { error } = await supabase
    .from("businesses")
    .update({
      name,
      business_type: businessType,
      address: address || null,
      phone: phone || null,
      email: email || null,
      description: description || null,
    })
    .eq("id", businessId)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  return {};
}

export async function updateOpeningHours(
  businessId: string,
  hours: OpeningHours
): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { error } = await supabase
    .from("businesses")
    .update({ opening_hours: hours })
    .eq("id", businessId)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  return {};
}
