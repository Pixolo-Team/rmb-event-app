import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Response } from "express";

export const SESSION_COOKIE = "evento_session";
const SESSION_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

@Injectable()
export class SessionService {
  constructor(private readonly jwt: JwtService) {}

  async issueSessionToken(attendeeId: string): Promise<string> {
    return this.jwt.signAsync({ sub: attendeeId });
  }

  /** Returns the attendee id from a session token, or null if invalid/expired. */
  async verifySessionToken(token: string): Promise<string | null> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      return payload.sub;
    } catch {
      return null;
    }
  }

  setSessionCookie(res: Response, token: string): void {
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_COOKIE_MAX_AGE_MS,
    });
  }
}
