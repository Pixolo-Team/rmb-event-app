import { Injectable, Logger } from "@nestjs/common";

/**
 * Swap point for a real provider (Postmark/Resend — see DEVELOPMENT_PLAN.md).
 * In development the link is logged (and echoed back to the caller) instead of
 * actually being emailed, so the full flow is testable with zero vendor accounts.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly isProd = process.env.NODE_ENV === "production";

  async sendMagicLinkEmail(
    email: string,
    link: string,
  ): Promise<{ devLink?: string }> {
    if (this.isProd) {
      // TODO: call the real provider here, e.g.
      // await this.postmark.sendEmail({ To: email, TemplateAlias: 'magic-link', TemplateModel: { link } })
      throw new Error(
        "MailService: no production email provider configured yet",
      );
    }

    this.logger.log(`[dev] Magic link for ${email}: ${link}`);
    return { devLink: link };
  }
}
