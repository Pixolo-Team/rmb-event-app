import { Module } from "@nestjs/common";
import { CheckinController } from "./checkin.controller";
import { CheckinService } from "./checkin.service";
import { EventModule } from "../event/event.module";
import { QRModule } from "../qr/qr.module";

@Module({
  imports: [EventModule, QRModule],
  controllers: [CheckinController],
  providers: [CheckinService],
})
export class CheckinModule {}
