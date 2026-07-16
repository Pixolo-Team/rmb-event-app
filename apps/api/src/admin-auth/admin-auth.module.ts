import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { RateLimiterService } from "../auth/rate-limiter.service";
import { AdminAuthController } from "./admin-auth.controller";
import { AdminAuthService } from "./admin-auth.service";
import { AdminSessionService } from "./admin-session.service";
import { AdminGuard } from "./admin.guard";

// Global so any module with an /admin/* controller can @UseGuards(AdminGuard)
// without importing this module explicitly (mirrors the @Global SessionModule).
// JwtModule is registered here (not inherited) so AdminSessionService can sign
// admin tokens; per-token 30-min expiry is set at sign time.
@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.SESSION_JWT_SECRET ?? "dev-only-insecure-secret-change-me",
    }),
  ],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminSessionService, AdminGuard, RateLimiterService],
  exports: [AdminSessionService, AdminGuard],
})
export class AdminAuthModule {}
