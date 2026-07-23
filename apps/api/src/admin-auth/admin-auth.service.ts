import { Injectable } from "@nestjs/common";
import { createHash, timingSafeEqual } from "crypto";
import { RateLimiterService } from "../common/rate-limit/rate-limiter.service";
import { PrismaService } from "../prisma/prisma.service";
import { verifyPassword } from "../common/password-hash";
import { AdminRole } from "@prisma/client";

// Lock an IP out after this many failed attempts within the limiter's window.
const MAX_FAILED_ATTEMPTS = 10;

export type AdminLoginResult =
  | { kind: "ok"; role: AdminRole; userId?: string }
  | { kind: "invalid" }
  | { kind: "locked"; retryAfterSeconds: number };

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly limiter: RateLimiterService,
    private readonly prisma: PrismaService,
  ) {}

  private get rootUsername(): string {
    return process.env.ADMIN_USERNAME ?? "admin";
  }

  // In production an explicit ADMIN_PASSWORD is required; dev falls back to a
  // known default so the pilot is usable out of the box.
  private get rootPassword(): string | null {
    const fromEnv = process.env.ADMIN_PASSWORD;
    if (fromEnv) return fromEnv;
    return process.env.NODE_ENV === "production" ? null : "evento-admin";
  }

  async login(username: string, password: string, ip: string): Promise<AdminLoginResult> {
    const key = `admin-login:${ip}`;

    const lock = this.limiter.peek(key, MAX_FAILED_ATTEMPTS);
    if (lock.limited) return { kind: "locked", retryAfterSeconds: lock.retryAfterSeconds };

    // The original env-based login always acts as SUPERADMIN and has no DB row.
    if (this.rootCredentialsValid(username, password)) {
      return { kind: "ok", role: "SUPERADMIN" };
    }

    const dbResult = await this.dbCredentialsValid(username, password);
    if (dbResult) return { kind: "ok", role: dbResult.role, userId: dbResult.id };

    // Only failures count toward the lockout.
    this.limiter.consume(key, MAX_FAILED_ATTEMPTS);
    return { kind: "invalid" };
  }

  private rootCredentialsValid(username: string, password: string): boolean {
    const expected = this.rootPassword;
    if (expected === null) return false;
    // Constant-time compare on fixed-length digests so neither the password
    // length nor its content leaks through timing.
    return this.safeEqual(username, this.rootUsername) && this.safeEqual(password, expected);
  }

  private async dbCredentialsValid(
    username: string,
    password: string,
  ): Promise<{ id: string; role: AdminRole } | null> {
    const user = await this.prisma.adminUser.findUnique({ where: { username } });
    if (!user || !user.active) return null;
    if (!(await verifyPassword(password, user.passwordHash))) return null;

    await this.prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return { id: user.id, role: user.role };
  }

  private safeEqual(a: string, b: string): boolean {
    const ha = createHash("sha256").update(a).digest();
    const hb = createHash("sha256").update(b).digest();
    return timingSafeEqual(ha, hb);
  }
}
