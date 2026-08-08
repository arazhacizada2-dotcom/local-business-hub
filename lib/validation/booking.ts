import { z } from "zod";

export const bookingSchema = z.object({
  businessId: z.string().uuid("Invalid business."),
  serviceId: z.string().uuid("Invalid service."),
  startsAt: z.string().datetime({ offset: true }),
  customerName: z.string().trim().min(1, "Name is required.").max(200),
  customerEmail: z.string().trim().email("Enter a valid email address.").max(320),
  customerPhone: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;
