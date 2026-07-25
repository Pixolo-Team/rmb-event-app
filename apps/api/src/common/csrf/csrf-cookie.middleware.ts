import { Request, Response, NextFunction } from 'express';
import { generateOpaqueToken } from '../tokens';

export const CSRF_COOKIE = 'evento_csrf';

export function csrfCookieMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.cookies?.[CSRF_COOKIE]) {
    const token = generateOpaqueToken();
    const secure = process.env.NODE_ENV === 'production';
    res.cookie(CSRF_COOKIE, token, {
      sameSite: secure ? 'none' : 'lax',
      secure,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true, // frontend reads the token via GET /csrf instead
    });
    // Make the freshly-issued token visible to this same request (e.g. the
    // GET /csrf handler) — cookie-parser only reflects cookies sent by the
    // client, not ones we just set on the response.
    req.cookies = { ...req.cookies, [CSRF_COOKIE]: token };
  }
  next();
}
