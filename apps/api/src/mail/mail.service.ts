import { Injectable, Logger } from "@nestjs/common";
import { createTransport, Transporter } from "nodemailer";

/**
 * Magic-link email delivery over SMTP (DEVELOPMENT_PLAN.md "Decisions Needed
 * Before Week 1" — Gmail SMTP for the pilot, generic enough to swap providers
 * by changing env vars only):
 * - SMTP_USER + SMTP_PASS set → real sends via SMTP_HOST (default
 *   smtp.gmail.com:465, i.e. Gmail with an app password). MAIL_FROM sets the
 *   sender, defaulting to the SMTP user.
 * - No creds, non-production → log the link and echo it back to the caller so
 *   the full flow is testable with zero vendor accounts.
 * - No creds, production → hard failure: login is the only entry channel, so a
 *   misconfigured prod deploy must be loud, not silent.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly isProd = process.env.NODE_ENV === "production";
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter | null {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!user || !pass) return null;

    if (!this.transporter) {
      const port = Number(process.env.SMTP_PORT ?? 465);
      this.transporter = createTransport({
        host: process.env.SMTP_HOST ?? "smtp.gmail.com",
        port,
        secure: port === 465, // SSL on 465, STARTTLS otherwise
        auth: { user, pass },
      });
    }
    return this.transporter;
  }

  async sendMagicLinkEmail(
    email: string,
    link: string,
  ): Promise<{ devLink?: string }> {
    const transporter = this.getTransporter();

    if (!transporter) {
      if (this.isProd) {
        throw new Error("MailService: SMTP_USER/SMTP_PASS are not set in production");
      }
      this.logger.log(`[dev] Magic link for ${email}: ${link}`);
      return { devLink: link };
    }

    const from = process.env.MAIL_FROM ?? `Evento <${process.env.SMTP_USER}>`;

    try {
      await transporter.sendMail({
        from,
        to: email,
        subject: "Your Evento access link",
        text: `Sign in to Evento: ${link}\n\nThe link works once and expires in 30 minutes. Didn't request this? You can safely ignore this email.`,
        html: [
          `<p>Tap the button below to sign in to Evento. The link works once and expires in 30 minutes.</p>`,
          `<p><a href="${link}" style="display:inline-block;padding:12px 22px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600">Sign in to Evento</a></p>`,
          `<p style="font-size:12px;color:#666">Or copy this link into your browser:<br>${link}</p>`,
          `<p style="font-size:12px;color:#666">Didn't request this? You can safely ignore this email.</p>`,
        ].join(""),
      });
    } catch (err) {
      this.logger.error(`SMTP send failed for ${email}: ${(err as Error).message}`);
      if (this.isProd) {
        throw new Error("MailService: SMTP send failed");
      }
      // Dev with bad/blocked SMTP creds: fall back to the on-screen link so
      // the flow stays testable while the send issue is investigated.
      this.logger.log(`[dev] Magic link for ${email}: ${link}`);
      return { devLink: link };
    }

    this.logger.log(`Magic link email sent to ${email}`);
    // The on-screen dev link is suppressed once real sending works — outside
    // production it would otherwise leak the token to anyone at the screen.
    return {};
  }
}
