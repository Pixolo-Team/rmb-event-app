import { Module } from "@nestjs/common";
import { EventController } from "./event.controller";
import { EventPublicController } from "./event-public.controller";
import { EventService } from "./event.service";

@Module({
  controllers: [EventController, EventPublicController],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}
