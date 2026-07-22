import { Injectable, Logger } from "@nestjs/common";

/**
 * Swap point for a real WhatsApp Business API provider (Meta Cloud API, Gupshup,
 * Interakt — see DEVELOPMENT_PLAN.md "Decisions Needed Before Week 1"). In
 * development the message is logged instead of actually being sent, same
 * pattern as MailService.
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly isProd = process.env.NODE_ENV === "production";

  async sendOnboardingInvite(
    phone: string,
    attendeeName: string,
    link: string,
  ): Promise<{ devLink?: string }> {
    if (this.isProd) {
      // TODO: call the real WhatsApp Business API provider here.
      throw new Error(
        "WhatsAppService: no production WhatsApp provider configured yet",
      );
    }

    this.logger.log(
      `[dev] WhatsApp invite for ${attendeeName} <${phone}>: "Hi ${attendeeName}, you're invited! Complete your profile: ${link}"`,
    );
    return { devLink: link };
  }

  /**
   * Check-in confirmation via the globebot WhatsApp campaign API (real
   * provider, already live — unlike sendOnboardingInvite above). No-ops with
   * a log line when WA_API_KEY/WA_PHONE_NUMBER_ID aren't set, so local dev
   * without those creds doesn't fail.
   */
  async sendCheckinConfirmation(phone: string, attendeeName: string): Promise<void> {
    const apiKey = process.env.WA_API_KEY;
    const phoneNumberId = process.env.WA_PHONE_NUMBER_ID;

    if (!apiKey || !phoneNumberId) {
      this.logger.log(
        `[dev] WhatsApp check-in confirmation skipped for ${attendeeName} <${phone}> — WA_API_KEY/WA_PHONE_NUMBER_ID not set`,
      );
      return;
    }

    const baseUrl = process.env.WA_API_BASE_URL ?? "https://wa-api.globebot.io/api/v22";
    const templateName = process.env.WA_CHECKIN_TEMPLATE_NAME ?? "checkin_corfimation_message";
    const templateLanguage = process.env.WA_CHECKIN_TEMPLATE_LANGUAGE ?? "en_US";
    const link = process.env.WA_CHECKIN_LINK ?? "https://rmbf.systemdeck.in/";

    const res = await fetch(`${baseUrl}/campaigns/create`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        campaign_name: "checkin_update",
        phone_number_id: phoneNumberId,
        template_name: templateName,
        numbers: [this.normalizePhone(phone)],
        template_language: templateLanguage,
        variablesMap: [attendeeName, link],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`WhatsApp campaign API responded ${res.status}: ${body}`);
    }

    this.logger.log(`WhatsApp check-in confirmation sent to ${attendeeName} <${phone}>`);
  }

  // Attendee phone numbers are stored however the organizer typed them in the
  // import CSV (no normalization on the way in — see admin-import.service.ts),
  // so a bare 10-digit local number needs the country code prepended for the
  // WhatsApp API, which expects e.g. "919119151400".
  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) {
      const countryCode = process.env.WA_DEFAULT_COUNTRY_CODE ?? "91";
      return `${countryCode}${digits}`;
    }
    return digits;
  }
}
