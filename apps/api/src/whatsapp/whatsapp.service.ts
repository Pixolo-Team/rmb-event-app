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
}
