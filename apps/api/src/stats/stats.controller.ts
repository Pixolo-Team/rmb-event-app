import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { SessionGuard, RequestWithAttendee } from "../session/session.guard";
import { StatsService } from "./stats.service";

@Controller("attendees/me")
@UseGuards(SessionGuard)
export class StatsController {
  constructor(private readonly stats: StatsService) {}
  @Get("stats") get(@Req() req: RequestWithAttendee) { return this.stats.get(req.attendeeId); }
}
