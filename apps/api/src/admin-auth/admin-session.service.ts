import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Response } from "express";

export const ADMIN_SESSION_COOKIE = "evento_admin_session";
// 30-minute idle timeout (PF3). AdminGuard re-issues the cookie on every
// authenticated request, so this is a *sliding* window: 30 minutes of
// inactivity expires the session, active use never does.
export const ADMIN_IDLE_MS = 30 * 60 * 1000;
const ADMIN_IDLE_SECONDS = ADMIN_IDLE_MS / 1000;

@Injectable()
export class AdminSessionService {
  constructor(private readonly jwt: JwtService) {}

  issueToken(): Promise<string> {
    return this.jwt.signAsync({ role: "admin" }, { expiresIn: ADMIN_IDLE_SECONDS });
  }

  /** True if the token is a currently-valid admin session token. */
  async verifyToken(token: string): Promise<boolean> {
    try {
      const payload = await this.jwt.verifyAsync<{ role?: string }>(token);
      return payload.role === "admin";
    } catch {
      return false;
    }
  }

  setCookie(res: Response, token: string): void {
    res.cookie(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ADMIN_IDLE_MS,
    });
  }

  clearCookie(res: Response): void {
    res.clearCookie(ADMIN_SESSION_COOKIE, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
}
