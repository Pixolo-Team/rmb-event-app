import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { SessionService } from "../session/session.service";
import { RateLimiterService } from "../common/rate-limit/rate-limiter.service";
import { generateOpaqueToken, hashToken } from "../common/tokens";

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes, per SCREENS.md Screen 2.0
const MAX_SENDS_PER_EMAIL_PER_HOUR = 5;
const MAX_SENDS_PER_IP_PER_HOUR = 15; // coarse device proxy — see SCREENS.md's "~3/hour per requesting device"

export type RequestMagicLinkResult =
  | { kind: "sent"; devLink?: string }
  | { kind: "not_registered" }
  | { kind: "rate_limited"; retryAfterSeconds: number };

export type VerifyMagicLinkResult =
  | {
      kind: "ok";
      sessionToken: string;
      // profileCompletedAt drives post-login routing (SCREENS.md Screen 2.0):
      // null → Profile Setup (1.1), set → Home (2.1).
      attendee: { id: string; name: string; email: string; profileCompletedAt: Date | null };
    }
  | { kind: "expired" };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly rateLimiter: RateLimiterService,
    private readonly session: SessionService,
  ) {}

  async requestMagicLink(
    rawEmail: string,
    requestIp: string,
    appOrigin: string,
  ): Promise<RequestMagicLinkResult> {
    const email = rawEmail.trim().toLowerCase();

    const perEmail = this.rateLimiter.consume(`email:${email}`, MAX_SENDS_PER_EMAIL_PER_HOUR);
    const perIp = this.rateLimiter.consume(`ip:${requestIp}`, MAX_SENDS_PER_IP_PER_HOUR);
    if (!perEmail.allowed || !perIp.allowed) {
      return {
        kind: "rate_limited",
        retryAfterSeconds: Math.max(perEmail.retryAfterSeconds, perIp.retryAfterSeconds),
      };
    }

    // The pilot deliberately reports an unknown address so a legitimate attendee
    // can correct it or ask the organizer for help instead of waiting indefinitely.
    // Rate limits still constrain automated account-discovery attempts.
    const attendee = await this.prisma.attendee.findUnique({ where: { email } });
    if (!attendee || attendee.deletedAt) {
      return { kind: "not_registered" };
      
    const rawToken = generateOpaqueToken();

    await this.prisma.magicLinkToken.create({
      data: {
        attendeeId: attendee.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });

    const link = `${appOrigin}/login/verify?token=${rawToken}`;
    const { devLink } = await this.mail.sendMagicLinkEmail(email, link);

    return { kind: "sent", devLink };
  }

  async verifyMagicLink(rawToken: string): Promise<VerifyMagicLinkResult> {
    const record = await this.prisma.magicLinkToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: { attendee: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date() || record.attendee.deletedAt) {
      return { kind: "expired" };
    }

    await this.prisma.magicLinkToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    const sessionToken = await this.session.issueSessionToken(record.attendee.id);

    return {
      kind: "ok",
      sessionToken,
      attendee: {
        id: record.attendee.id,
        name: record.attendee.name,
        email: record.attendee.email,
        profileCompletedAt: record.attendee.profileCompletedAt,
      },
    };
  }
}
