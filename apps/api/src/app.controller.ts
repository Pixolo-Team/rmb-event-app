import { Controller, Get, Req } from "@nestjs/common";
import type { Request } from "express";
import { CSRF_COOKIE } from "./common/csrf/csrf-cookie.middleware";

@Controller()
export class AppController {
  @Get("health")
  health() {
    return { status: "ok" };
  }

  /**
   * The web app can no longer read the CSRF cookie via document.cookie once
   * it's cross-origin (the cookie belongs to this API's own domain), so it
   * fetches the current value here instead. csrfCookieMiddleware guarantees
   * req.cookies[CSRF_COOKIE] is populated before this handler runs.
   */
  @Get("csrf")
  csrf(@Req() req: Request) {
    return { csrfToken: req.cookies[CSRF_COOKIE] };
  }
}
