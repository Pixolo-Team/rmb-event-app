import { CanActivate, ExecutionContext, ForbiddenException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimiterService } from './rate-limiter.service';
import { RATE_LIMIT_KEY } from './rate-limit.decorator';

/**
 * Guard that enforces per‑endpoint rate limiting.
 * It reads the limit from the @RateLimit decorator via metadata.
 * If no metadata is present, the guard allows the request (opt‑in).
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private reflector: Reflector, private rateLimiter: RateLimiterService) {}

  canActivate(context: ExecutionContext): boolean {
    const limit = this.reflector.getAllAndOverride<number>(RATE_LIMIT_KEY, [context.getHandler(), context.getClass()]);
    if (limit === undefined) {
      return true; // No rate‑limit applied to this route
    }
    const request = context.switchToHttp().getRequest();
    // Build a key: prefer authenticated attendeeId, then admin flag, finally IP
    const attendeeId = request.attendeeId; // set by SessionGuard if present
    const adminFlag = request.isAdmin ? 'admin' : null; // placeholder, adjust if needed
    const ip = request.ip;
    const key = attendeeId ? `attendee:${attendeeId}` : adminFlag ? `admin:${request.session?.adminId || ip}` : `ip:${ip}`;

    const result = this.rateLimiter.consume(key, limit);
    if (!result.allowed) {
      // Match shape used by auth rate limiting
      throw new HttpException({ status: 'rate_limited', retryAfterSeconds: result.retryAfterSeconds }, HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
