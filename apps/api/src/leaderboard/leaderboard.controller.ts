import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { RequestWithAttendee, SessionGuard } from "../session/session.guard";
import { LeaderboardService } from "./leaderboard.service";

@Controller("leaderboard")
export class LeaderboardController {
  constructor(private readonly leaderboard: LeaderboardService) {}

  @Get("venue")
  venue() { return this.leaderboard.getVenueDisplay(); }

  @Get()
  @UseGuards(SessionGuard)
  attendee(@Req() req: RequestWithAttendee) { return this.leaderboard.getForAttendee(req.attendeeId); }
}
