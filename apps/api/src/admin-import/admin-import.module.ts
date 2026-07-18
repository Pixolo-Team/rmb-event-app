import { Module } from "@nestjs/common";
import { AdminImportController } from "./admin-import.controller";
import { AdminImportService } from "./admin-import.service";
import { QRModule } from "../qr/qr.module";

@Module({
  imports: [QRModule],
  controllers: [AdminImportController],
  providers: [AdminImportService],
})
export class AdminImportModule {}
