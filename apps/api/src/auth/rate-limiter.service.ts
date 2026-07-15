import { Injectable } from "@nestjs/common";

const HOUR_MS = 60 * 60 * 1000;

/**
 * In-memory sliding-window limiter — fine at pilot scale (single process,
 * see DEVELOPMENT_PLAN.md's "no Redis for the pilot" call). Resets on restart.
 */
@Injectable()
export class RateLimiterService {
  private hits = new Map<string, number[]>();

  /** Returns true if `key` is still under `limit` requests in the last hour, and records this attempt. */
  consume(key: string, limit: number): { allowed: boolean; retryAfterSeconds: number } {
    const now = Date.now();
    const windowStart = now - HOUR_MS;
    const timestamps = (this.hits.get(key) ?? []).filter((t) => t > windowStart);

    if (timestamps.length >= limit) {
      const retryAfterMs = timestamps[0] + HOUR_MS - now;
      return { allowed: false, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
    }

    timestamps.push(now);
    this.hits.set(key, timestamps);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}
