import { Module } from "@nestjs/common";
import { MatchingService } from "./matching.service";

// F2.1 — the matching engine is its own module (PRD US2.3: decoupled so Phase 2
// can swap the algorithm). It has no dependencies; consumers import it and call
// the pure MatchingService.
@Module({
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}
