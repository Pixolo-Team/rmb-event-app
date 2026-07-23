import { Module } from "@nestjs/common";
import { ConnectionsController, MeetingsController } from "./meetings.controller";
import { MeetingsService } from "./meetings.service";
import { RateLimitModule } from "../common/rate-limit/rate-limit.module";
import { UploadsModule } from "../uploads/uploads.module";

@Module({
  imports: [RateLimitModule, UploadsModule],
  controllers: [MeetingsController, ConnectionsController],
  providers: [MeetingsService],
  exports: [MeetingsService],
})
export class MeetingsModule {}
