import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request, Response } from "express";
import { AdminRole } from "@prisma/client";
import { AdminSessionService, ADMIN_SESSION_COOKIE } from "./admin-session.service";

export interface RequestWithAdmin extends Request {
  admin?: { userId?: string; role: AdminRole };
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly session: AdminSessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest<RequestWithAdmin>();
    const res = http.getResponse<Response>();

    const token = req.cookies?.[ADMIN_SESSION_COOKIE];
    const payload = token ? await this.session.verifyToken(token) : null;
    if (!payload) {
      throw new UnauthorizedException("Admin sign-in required");
    }

    req.admin = { userId: payload.userId, role: payload.staffRole };

    // Slide the 30-minute idle window forward on every authenticated request.
    this.session.setCookie(res, await this.session.issueToken(payload.staffRole, payload.userId));
    return true;
  }
}
