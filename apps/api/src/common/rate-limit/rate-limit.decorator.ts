import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';
/**
 * Decorator to specify a per‑endpoint rate limit (requests per hour).
 * Applied together with RateLimitGuard.
 */
export const RateLimit = (limit: number) => SetMetadata(RATE_LIMIT_KEY, limit);
