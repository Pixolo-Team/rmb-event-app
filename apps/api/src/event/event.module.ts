import { Module } from "@nestjs/common";
import { EventController } from "./event.controller";
import { EventPublicController } from "./event-public.controller";
import { EventService } from "./event.service";
import { UploadsModule } from "../uploads/uploads.module";

@Module({
  imports: [UploadsModule],
  controllers: [EventController, EventPublicController],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}
