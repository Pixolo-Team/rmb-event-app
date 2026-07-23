import { Module } from "@nestjs/common";
import { ConnectionsController } from "./connections.controller";
import { ConnectionsService } from "./connections.service";
import { QRModule } from "../qr/qr.module";
import { UploadsModule } from "../uploads/uploads.module";

@Module({
  imports: [QRModule, UploadsModule],
  controllers: [ConnectionsController],
  providers: [ConnectionsService],
})
export class ConnectionsModule {}
