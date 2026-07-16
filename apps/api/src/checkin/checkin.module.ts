import { Module } from "@nestjs/common";
import { CheckinController } from "./checkin.controller";
import { CheckinService } from "./checkin.service";
import { EventModule } from "../event/event.module";

@Module({
  imports: [EventModule],
  controllers: [CheckinController],
  providers: [CheckinService],
})
export class CheckinModule {}
