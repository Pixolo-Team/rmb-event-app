import { Module } from "@nestjs/common";
import { AdminImportController } from "./admin-import.controller";
import { AdminImportService } from "./admin-import.service";

@Module({
  controllers: [AdminImportController],
  providers: [AdminImportService],
})
export class AdminImportModule {}
