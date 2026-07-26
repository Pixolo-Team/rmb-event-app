import { Module } from "@nestjs/common";
import { ConnectionsController } from "./connections.controller";
import { ConnectionsService } from "./connections.service";
import { UploadsModule } from "../uploads/uploads.module";

@Module({
  imports: [UploadsModule],
  controllers: [ConnectionsController],
  providers: [ConnectionsService],
})
export class ConnectionsModule {}
