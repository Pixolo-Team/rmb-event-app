import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Response } from "express";
import { AdminRole } from "@prisma/client";

export const ADMIN_SESSION_COOKIE = "evento_admin_session";
// 30-minute idle timeout (PF3). AdminGuard re-issues the cookie on every
// authenticated request, so this is a *sliding* window: 30 minutes of
// inactivity expires the session, active use never does.
export const ADMIN_IDLE_MS = 30 * 60 * 1000;
const ADMIN_IDLE_SECONDS = ADMIN_IDLE_MS / 1000;

export interface AdminSessionPayload {
  role: "admin";
  staffRole: AdminRole;
  userId?: string;
}

@Injectable()
export class AdminSessionService {
  constructor(private readonly jwt: JwtService) {}

  issueToken(staffRole: AdminRole, userId?: string): Promise<string> {
    const payload: AdminSessionPayload = { role: "admin", staffRole, userId };
    return this.jwt.signAsync(payload, { expiresIn: ADMIN_IDLE_SECONDS });
  }

  /** The session payload if the token is currently valid, otherwise null. */
  async verifyToken(token: string): Promise<AdminSessionPayload | null> {
    try {
      const payload = await this.jwt.verifyAsync<AdminSessionPayload>(token);
      if (payload.role !== "admin" || !payload.staffRole) return null;
      return payload;
    } catch {
      return null;
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
