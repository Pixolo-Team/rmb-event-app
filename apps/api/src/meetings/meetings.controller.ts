import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from "@nestjs/common";
import { MeetingsService } from "./meetings.service";
import { ScanDto } from "./dto/scan.dto";
import { SessionGuard, RequestWithAttendee } from "../session/session.guard";

@Controller("meetings")
export class MeetingsController {
  constructor(private readonly meetings: MeetingsService) {}

  // One scan = exchange cards + log a confirmed meeting (F4.2). Idempotent, so
  // the client can safely queue and replay it while offline (PF4).
  @Post("scan")
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  scan(@Req() req: RequestWithAttendee, @Body() dto: ScanDto) {
    return this.meetings.scan(req.attendeeId, dto.qrToken);
  }
}
