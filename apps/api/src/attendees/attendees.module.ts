import { Module } from "@nestjs/common";
import { AttendeesController } from "./attendees.controller";
import { AdminAttendeesController } from "./admin-attendees.controller";
import { AttendeesService } from "./attendees.service";
import { MatchingModule } from "../matching/matching.module";
import { UploadsModule } from "../uploads/uploads.module";

@Module({
  imports: [MatchingModule, UploadsModule],
  controllers: [AttendeesController, AdminAttendeesController],
  providers: [AttendeesService],
})
export class AttendeesModule {}
