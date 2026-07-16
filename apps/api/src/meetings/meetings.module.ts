import { Module } from "@nestjs/common";
import { ConnectionsController, MeetingsController } from "./meetings.controller";
import { MeetingsService } from "./meetings.service";

@Module({
  controllers: [MeetingsController, ConnectionsController],
  providers: [MeetingsService],
  exports: [MeetingsService],
})
export class MeetingsModule {}
