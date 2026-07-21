import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { RequestMagicLinkDto } from "./dto/request-magic-link.dto";
import { VerifyMagicLinkDto } from "./dto/verify-magic-link.dto";
import { SessionService } from "../session/session.service";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly session: SessionService,
  ) {}

  @Post("magic-link")
  @HttpCode(HttpStatus.OK)
  async requestMagicLink(
    @Body() dto: RequestMagicLinkDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const appOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
    const result = await this.auth.requestMagicLink(dto.email, req.ip ?? "unknown", appOrigin);

    if (result.kind === "rate_limited") {
      res.status(HttpStatus.TOO_MANY_REQUESTS);
      return { status: "rate_limited", retryAfterSeconds: result.retryAfterSeconds };
    }

    if (result.kind === "not_registered") {
      res.status(HttpStatus.NOT_FOUND);
      return {
        status: "not_registered",
        message:
          "We couldn't find this email. Try the email used during registration, or contact the event organizer.",
      };
    }

    return { status: "sent", devLink: result.devLink };
  }

  @Post("magic-link/verify")
  @HttpCode(HttpStatus.OK)
  async verifyMagicLink(
    @Body() dto: VerifyMagicLinkDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.verifyMagicLink(dto.token);

    if (result.kind === "expired") {
      res.status(HttpStatus.UNAUTHORIZED);
      return { status: "expired" };
    }

    this.session.setSessionCookie(res, result.sessionToken);

    return { status: "ok", attendee: result.attendee };
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response) {
    this.session.clearSessionCookie(res);
  }
}
