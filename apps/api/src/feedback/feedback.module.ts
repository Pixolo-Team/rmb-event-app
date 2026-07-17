import { Module } from "@nestjs/common";
import { AdminFeedbackController, FeedbackController } from "./feedback.controller";
import { FeedbackService } from "./feedback.service";
import { RateLimitModule } from "../common/rate-limit/rate-limit.module";

@Module({
  imports: [RateLimitModule],
  controllers: [FeedbackController, AdminFeedbackController],
  providers: [FeedbackService]
})
export class FeedbackModule {}
