"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ActionResult {
  error?: string;
}

async function getOwnedBusinessId(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();
  return data?.id as string | undefined;
}

export async function createService(formData: FormData): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const businessId = await getOwnedBusinessId(supabase, user.id);
  if (!businessId) return { error: "No business found for this account." };

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const price = Number(formData.get("price") || 0);
  const duration = Number(formData.get("duration") || 0);

  if (!name) return { error: "Service name is required." };
  if (!Number.isFinite(price) || price < 0) return { error: "Enter a valid price." };
  if (!Number.isFinite(duration) || duration <= 0) return { error: "Enter a valid duration." };

  const { error } = await supabase.from("services").insert({
    business_id: businessId,
    name,
    description: description || null,
    price_cents: Math.round(price * 100),
    duration_minutes: Math.round(duration),
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/services");
  return {};
}

export async function updateService(formData: FormData): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const businessId = await getOwnedBusinessId(supabase, user.id);
  if (!businessId) return { error: "No business found for this account." };

  const serviceId = String(formData.get("serviceId") || "");
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const price = Number(formData.get("price") || 0);
  const duration = Number(formData.get("duration") || 0);

  if (!serviceId || !name) return { error: "Service name is required." };
  if (!Number.isFinite(price) || price < 0) return { error: "Enter a valid price." };
  if (!Number.isFinite(duration) || duration <= 0) return { error: "Enter a valid duration." };

  const { error } = await supabase
    .from("services")
    .update({
      name,
      description: description || null,
      price_cents: Math.round(price * 100),
      duration_minutes: Math.round(duration),
    })
    .eq("id", serviceId)
    .eq("business_id", businessId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/services");
  return {};
}

export async function toggleServiceActive(serviceId: string, isActive: boolean): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const businessId = await getOwnedBusinessId(supabase, user.id);
  if (!businessId) return { error: "No business found for this account." };

  const { error } = await supabase
    .from("services")
    .update({ is_active: isActive })
    .eq("id", serviceId)
    .eq("business_id", businessId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/services");
  return {};
}

export async function deleteService(serviceId: string): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const businessId = await getOwnedBusinessId(supabase, user.id);
  if (!businessId) return { error: "No business found for this account." };

  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", serviceId)
    .eq("business_id", businessId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/services");
  return {};
}
