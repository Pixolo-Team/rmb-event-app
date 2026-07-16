import { Module } from "@nestjs/common";
import { AttendeesController } from "./attendees.controller";
import { AdminAttendeesController } from "./admin-attendees.controller";
import { AttendeesService } from "./attendees.service";

@Module({
  controllers: [AttendeesController, AdminAttendeesController],
  providers: [AttendeesService],
})
export class AttendeesModule {}
