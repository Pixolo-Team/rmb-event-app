import { Request, Response, NextFunction } from 'express';
import { generateOpaqueToken } from '../tokens';

export const CSRF_COOKIE = 'evento_csrf';

export function csrfCookieMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.cookies?.[CSRF_COOKIE]) {
    res.cookie(CSRF_COOKIE, generateOpaqueToken(), {
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: false, // Frontend needs to read this cookie
    });
  }
  next();
}
