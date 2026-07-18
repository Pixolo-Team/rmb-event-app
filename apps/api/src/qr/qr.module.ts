import { Module } from "@nestjs/common";
import { QRSigningService } from "./qr-signing.service";

@Module({
  providers: [QRSigningService],
  exports: [QRSigningService],
})
export class QRModule {}
