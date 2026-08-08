import { Resend } from "resend";
import { format } from "date-fns";

// Lazy initialize to avoid errors during build time
let resend: Resend | null = null;
function getResendClient() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function sendBookingNotification({
  ownerEmail,
  customerName,
  customerEmail,
  customerPhone,
  serviceName,
  startsAt,
  notes,
}: {
  ownerEmail: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  serviceName: string;
  startsAt: string;
  notes?: string | null;
}) {
  const client = getResendClient();
  if (!client) {
    console.error("Resend client not initialized: Missing RESEND_API_KEY");
    return { error: "Missing API key" };
  }

  try {
    const { data, error } = await client.emails.send({
      from: "Booking <onboarding@resend.dev>", // Replace with your verified domain
      to: ownerEmail,
      subject: `New Booking: ${serviceName} with ${customerName}`,
      html: `
        <h1>New Appointment Booked</h1>
        <p><strong>Customer:</strong> ${customerName}</p>
        <p><strong>Email:</strong> ${customerEmail}</p>
        ${customerPhone ? `<p><strong>Phone:</strong> ${customerPhone}</p>` : ""}
        <p><strong>Service:</strong> ${serviceName}</p>
        <p><strong>Date/Time:</strong> ${format(new Date(startsAt), "PPPPp")}</p>
        ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ""}
      `,
    });

    if (error) {
      console.error("Failed to send booking email notification:", error);
      return { error };
    }

    return { data };
  } catch (err) {
    console.error("Unexpected error sending booking email:", err);
    return { error: err };
  }
}
