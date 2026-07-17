import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request, Response } from "express";
import { AdminSessionService, ADMIN_SESSION_COOKIE } from "./admin-session.service";

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly session: AdminSessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const token = req.cookies?.[ADMIN_SESSION_COOKIE];
    if (!token || !(await this.session.verifyToken(token))) {
      throw new UnauthorizedException("Admin sign-in required");
    }

    // Slide the 30-minute idle window forward on every authenticated request.
    this.session.setCookie(res, await this.session.issueToken());
    return true;
  }
}
