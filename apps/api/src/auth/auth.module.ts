import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { RateLimiterService } from "../common/rate-limit/rate-limiter.service";

@Module({
  controllers: [AuthController],
  providers: [AuthService, RateLimiterService],
})
export class AuthModule {}
