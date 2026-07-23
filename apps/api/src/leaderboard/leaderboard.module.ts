import { Module } from "@nestjs/common";
import { LeaderboardController } from "./leaderboard.controller";
import { LeaderboardService } from "./leaderboard.service";
import { UploadsModule } from "../uploads/uploads.module";

@Module({ imports: [UploadsModule], controllers: [LeaderboardController], providers: [LeaderboardService], exports: [LeaderboardService] })
export class LeaderboardModule {}
