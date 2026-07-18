import { Injectable } from "@nestjs/common";
import { createHash, timingSafeEqual } from "crypto";
import { RateLimiterService } from "../common/rate-limit/rate-limiter.service";

// Lock an IP out after this many failed attempts within the limiter's window.
const MAX_FAILED_ATTEMPTS = 10;

export type AdminLoginResult =
  | { kind: "ok" }
  | { kind: "invalid" }
  | { kind: "locked"; retryAfterSeconds: number };

@Injectable()
export class AdminAuthService {
  constructor(private readonly limiter: RateLimiterService) {}

  private get username(): string {
    return process.env.ADMIN_USERNAME ?? "admin";
  }

  // In production an explicit ADMIN_PASSWORD is required; dev falls back to a
  // known default so the pilot is usable out of the box.
  private get password(): string | null {
    const fromEnv = process.env.ADMIN_PASSWORD;
    if (fromEnv) return fromEnv;
    return process.env.NODE_ENV === "production" ? null : "evento-admin";
  }

  login(username: string, password: string, ip: string): AdminLoginResult {
    const key = `admin-login:${ip}`;

    const lock = this.limiter.peek(key, MAX_FAILED_ATTEMPTS);
    if (lock.limited) return { kind: "locked", retryAfterSeconds: lock.retryAfterSeconds };

    if (this.credentialsValid(username, password)) return { kind: "ok" };

    // Only failures count toward the lockout.
    this.limiter.consume(key, MAX_FAILED_ATTEMPTS);
    return { kind: "invalid" };
  }

  private credentialsValid(username: string, password: string): boolean {
    const expected = this.password;
    if (expected === null) return false;
    // Constant-time compare on fixed-length digests so neither the password
    // length nor its content leaks through timing.
    return this.safeEqual(username, this.username) && this.safeEqual(password, expected);
  }

  private safeEqual(a: string, b: string): boolean {
    const ha = createHash("sha256").update(a).digest();
    const hb = createHash("sha256").update(b).digest();
    return timingSafeEqual(ha, hb);
  }
}
