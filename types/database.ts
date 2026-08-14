export type AppointmentStatus = "pending" | "confirmed" | "cancelled" | "completed";
export type Plan = "free" | "pro" | "business";
export type PageViewEvent = "page_view" | "booking_attempt" | "booking_completed";

export interface DayHours {
  open: string; // "09:00"
  close: string; // "18:00"
  closed: boolean;
}

export type OpeningHours = Record<
  "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun",
  DayHours
>;

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_path: string | null;
  created_at: string;
}

export interface Business {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  business_type: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  timezone: string;
  opening_hours: OpeningHours;
  plan: Plan;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  duration_minutes: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  business_id: string;
  service_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
}

export interface PageView {
  id: string;
  business_id: string;
  event_type: PageViewEvent;
  created_at: string;
}

export const DAY_LABELS: Record<keyof OpeningHours, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export const DAY_ORDER: (keyof OpeningHours)[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];

export function formatPrice(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}
