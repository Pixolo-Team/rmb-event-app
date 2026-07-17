import { Module } from "@nestjs/common";
import { EventModule } from "../event/event.module";
import { LeaderboardModule } from "../leaderboard/leaderboard.module";
import { AdminStatsController, StatsController } from "./stats.controller";
import { StatsService } from "./stats.service";

@Module({
  imports: [LeaderboardModule, EventModule],
  controllers: [StatsController, AdminStatsController],
  providers: [StatsService],
})
export class StatsModule {}
