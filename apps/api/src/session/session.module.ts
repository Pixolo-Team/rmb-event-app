import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { SessionService } from "./session.service";

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.SESSION_JWT_SECRET ?? "dev-only-insecure-secret-change-me",
      signOptions: { expiresIn: "30d" },
    }),
  ],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
