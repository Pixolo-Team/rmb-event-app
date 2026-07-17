import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { AdminAuthService } from "./admin-auth.service";
import { AdminSessionService } from "./admin-session.service";
import { AdminGuard } from "./admin.guard";
import { AdminLoginDto } from "./dto/admin-login.dto";

@Controller("admin/auth")
export class AdminAuthController {
  constructor(
    private readonly auth: AdminAuthService,
    private readonly session: AdminSessionService,
  ) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: AdminLoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = this.auth.login(dto.username, dto.password, req.ip ?? "unknown");

    if (result.kind === "locked") {
      res.status(HttpStatus.TOO_MANY_REQUESTS);
      return { status: "locked", retryAfterSeconds: result.retryAfterSeconds };
    }
    if (result.kind === "invalid") {
      res.status(HttpStatus.UNAUTHORIZED);
      return { status: "invalid" };
    }

    this.session.setCookie(res, await this.session.issueToken());
    return { status: "ok" };
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response) {
    this.session.clearCookie(res);
  }

  // Guarded probe the web AdminGate uses to decide whether to show the login
  // screen; the guard also slides the idle window forward.
  @Get("me")
  @UseGuards(AdminGuard)
  me() {
    return { status: "ok" };
  }
}
