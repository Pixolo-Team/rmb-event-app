import { Module } from "@nestjs/common";
import { AdminImportController } from "./admin-import.controller";
import { AdminImportService } from "./admin-import.service";
import { RateLimitModule } from "../common/rate-limit/rate-limit.module";

@Module({
  imports: [RateLimitModule],
  controllers: [AdminImportController],
  providers: [AdminImportService],
})
export class AdminImportModule {}
