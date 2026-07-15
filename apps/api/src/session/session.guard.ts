import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { SessionService, SESSION_COOKIE } from "./session.service";

export interface RequestWithAttendee extends Request {
  attendeeId: string;
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly session: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithAttendee>();
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) throw new UnauthorizedException("Not signed in");

    const attendeeId = await this.session.verifySessionToken(token);
    if (!attendeeId) throw new UnauthorizedException("Session expired");

    req.attendeeId = attendeeId;
    return true;
  }
}
