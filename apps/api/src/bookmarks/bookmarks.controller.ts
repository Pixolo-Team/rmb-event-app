import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { BookmarksService } from "./bookmarks.service";
import { SessionGuard, RequestWithAttendee } from "../session/session.guard";
import { ToggleBookmarkDto } from "./dto/toggle-bookmark.dto";

@Controller("bookmarks")
@UseGuards(SessionGuard)
export class BookmarksController {
  constructor(private readonly bookmarks: BookmarksService) {}

  @Get()
  async list(@Req() req: RequestWithAttendee) {
    return this.bookmarks.listForAttendee(req.attendeeId);
  }

  @Post()
  async toggle(@Req() req: RequestWithAttendee, @Body() dto: ToggleBookmarkDto) {
    const result = await this.bookmarks.toggle(req.attendeeId, dto.attendeeId);
    return { status: "ok", ...result };
  }
}
