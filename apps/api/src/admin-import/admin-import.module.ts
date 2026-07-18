import { Module } from "@nestjs/common";
import { AdminImportController } from "./admin-import.controller";
import { AdminImportService } from "./admin-import.service";
import { QRModule } from "../qr/qr.module";
import { RateLimitModule } from "../common/rate-limit/rate-limit.module";

@Module({
  imports: [QRModule, RateLimitModule],
  controllers: [AdminImportController],
  providers: [AdminImportService],
})
export class AdminImportModule {}
