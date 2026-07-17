import { Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { SessionGuard, RequestWithAttendee } from "../session/session.guard";
import { MatchCacheService } from "./match-cache.service";

@Controller("matches")
@UseGuards(SessionGuard)
export class MatchesController {
  constructor(private readonly cache: MatchCacheService) {}

  @Get()
  list(@Req() req: RequestWithAttendee, @Query("refresh") refresh?: string) {
    return this.cache.listFor(req.attendeeId, refresh === "1");
  }

  @Post("recompute")
  recompute(@Req() req: RequestWithAttendee) {
    return this.cache.recomputeFor(req.attendeeId);
  }
}
