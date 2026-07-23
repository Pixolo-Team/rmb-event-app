import { Module } from "@nestjs/common";
import { MatchingService } from "./matching.service";
import { MatchCacheService } from "./match-cache.service";
import { MatchesController } from "./matches.controller";
import { UploadsModule } from "../uploads/uploads.module";

// F2.1 — the matching engine is its own module (PRD US2.3: decoupled so Phase 2
// can swap the algorithm). It has no dependencies; consumers import it and call
// the pure MatchingService.
@Module({
  imports: [UploadsModule],
  controllers: [MatchesController],
  providers: [MatchingService, MatchCacheService],
  exports: [MatchingService, MatchCacheService],
})
export class MatchingModule {}
