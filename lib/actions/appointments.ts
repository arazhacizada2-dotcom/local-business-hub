"use server";

import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { bookingSchema } from "@/lib/validation/booking";
import { revalidatePath } from "next/cache";
import { sendBookingNotification } from "@/lib/email";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

const RATE_LIMITS = {
  pageView: { limit: 60, windowMs: 60_000 },
  booking: { limit: 5, windowMs: 15 * 60_000 },
  bookedRanges: { limit: 120, windowMs: 60_000 },
} as const;

export async function trackPageView(businessId: string): Promise<void> {
  const rate = checkRateLimit("page_view", RATE_LIMITS.pageView);
  if (!rate.allowed) return;

  const supabase = createClient();
  await supabase.from("page_views").insert({ business_id: businessId, event_type: "page_view" });
}

/**
 * Returns already-booked [start, end] ranges (as ISO strings) for a business
 * on a given date via a security-definer RPC — no customer PII is exposed.
 */
export async function getBookedRanges(businessId: string, dateISO: string) {
  const rate = checkRateLimit("booked_ranges", RATE_LIMITS.bookedRanges);
  if (!rate.allowed) return [];

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return [];

  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_booked_ranges", {
    p_business_id: businessId,
    p_day: dateISO,
  });

  if (error) return [];
  return data ?? [];
}

export async function createBooking(formData: FormData): Promise<ActionResult> {
  const rate = checkRateLimit("create_booking", RATE_LIMITS.booking);
  if (!rate.allowed) {
    return {
      error: `Too many booking attempts. Please wait ${rate.retryAfterSec ?? 60} seconds and try again.`,
    };
  }

  // Honeypot: bots often fill hidden fields.
  const honeypot = String(formData.get("_hp_website") || "").trim();
  if (honeypot) {
    return { success: true };
  }

  const parsed = bookingSchema.safeParse({
    businessId: formData.get("businessId"),
    serviceId: formData.get("serviceId"),
    startsAt: formData.get("startsAt"),
    customerName: formData.get("customerName"),
    customerEmail: formData.get("customerEmail"),
    customerPhone: formData.get("customerPhone") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message;
    return { error: first ?? "Invalid booking details." };
  }

  const {
    businessId,
    serviceId,
    startsAt: startsAtISO,
    customerName,
    customerEmail,
    customerPhone,
    notes,
  } = parsed.data;

  const supabase = createClient();

  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id, business_id, name, duration_minutes, is_active")
    .eq("id", serviceId)
    .eq("business_id", businessId)
    .eq("is_active", true)
    .maybeSingle();

  // Public contact email only — not owner_id / plan (businesses_public view).
  const { data: publicBusiness } = await supabase
    .from("businesses_public")
    .select("email")
    .eq("id", businessId)
    .maybeSingle();

  if (serviceError || !service || !publicBusiness?.email) {
    return { error: "That service is no longer available. Please refresh and try again." };
  }

  await supabase.from("page_views").insert({ business_id: businessId, event_type: "booking_attempt" });

  const startsAt = new Date(startsAtISO);
  if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() < Date.now() - 60_000) {
    return { error: "Please choose a valid, upcoming time." };
  }

  const durationMinutes = service.duration_minutes as number;
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

  const { error } = await supabase.from("appointments").insert({
    business_id: businessId,
    service_id: serviceId,
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone || null,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    notes: notes || null,
    status: "pending",
  });

  if (error) {
    if (error.code === "23P01" || error.code === "23505") {
      return { error: "That time was just booked by someone else. Please pick another slot." };
    }
    if (error.code === "42501") {
      return { error: "Booking is not allowed for this service. Please refresh and try again." };
    }
    return { error: "Something went wrong. Please try again." };
  }

  await supabase.from("page_views").insert({ business_id: businessId, event_type: "booking_completed" });

  // Send email notification - fire and forget, don't block return
  sendBookingNotification({
    ownerEmail: publicBusiness.email,
    customerName,
    customerEmail,
    customerPhone,
    serviceName: service.name as string,
    startsAt: startsAtISO,
    notes,
  }).catch((err) => console.error("Error in booking email flow:", err));

  return { success: true };
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: "confirmed" | "cancelled" | "completed"
): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  if (!/^[0-9a-f-]{36}$/i.test(appointmentId)) {
    return { error: "Invalid appointment." };
  }

  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard");
  return { success: true };
}
