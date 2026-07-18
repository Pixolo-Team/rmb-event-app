import { Module } from "@nestjs/common";
import { CheckinController } from "./checkin.controller";
import { CheckinService } from "./checkin.service";
import { EventModule } from "../event/event.module";
import { QRModule } from "../qr/qr.module";
import { RateLimitModule } from "../common/rate-limit/rate-limit.module";

@Module({
  imports: [EventModule, QRModule, RateLimitModule],
  controllers: [CheckinController],
  providers: [CheckinService],
})
export class CheckinModule {}
