import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { MeetingsService } from "./meetings.service";
import { ScanDto } from "./dto/scan.dto";
import { SessionGuard, RequestWithAttendee } from "../session/session.guard";
import { UpdateConnectionNoteDto } from "./dto/update-connection-note.dto";
import { RateLimit } from "../common/rate-limit/rate-limit.decorator";
import { RateLimitGuard } from "../common/rate-limit/rate-limit.guard";

@Controller("meetings")
export class MeetingsController {
  constructor(private readonly meetings: MeetingsService) {}

  // One scan = exchange cards + log a confirmed meeting (F4.2). Idempotent, so
  // the client can safely queue and replay it while offline (PF4).
  @Post("scan")
  @UseGuards(SessionGuard, RateLimitGuard)
  @RateLimit(60)
  @HttpCode(HttpStatus.OK)
  scan(@Req() req: RequestWithAttendee, @Body() dto: ScanDto) {
    return this.meetings.scan(req.attendeeId, dto.qrToken);
  }
}

@Controller("attendees/me/connections")
@UseGuards(SessionGuard)
export class ConnectionsController {
  constructor(private readonly meetings: MeetingsService) {}

  @Get()
  list(@Req() req: RequestWithAttendee) {
    return this.meetings.connections(req.attendeeId);
  }

  @Patch(":attendeeId/note")
  updateNote(@Req() req: RequestWithAttendee, @Param("attendeeId") attendeeId: string, @Body() dto: UpdateConnectionNoteDto) {
    return this.meetings.updateNote(req.attendeeId, attendeeId, dto.note);
  }

  @Delete(":attendeeId")
  remove(@Req() req: RequestWithAttendee, @Param("attendeeId") attendeeId: string) {
    return this.meetings.removeConnection(req.attendeeId, attendeeId);
  }
}
