import { Controller, Get, Query, Req, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { SessionGuard, RequestWithAttendee } from "../session/session.guard";
import { SummaryService } from "./summary.service";

@Controller("attendees/me")
@UseGuards(SessionGuard)
export class SummaryController {
  constructor(private readonly summary: SummaryService) {}
  @Get("summary") get(@Req() req: RequestWithAttendee) { return this.summary.get(req.attendeeId); }
  @Get("connections/export") async export(@Req() req: RequestWithAttendee, @Query("format") requested: string | undefined, @Res() res: Response) {
    const format = requested === "vcf" ? "vcf" : "csv";
    const body = await this.summary.export(req.attendeeId, format);
    res.setHeader("Content-Type", format === "vcf" ? "text/vcard; charset=utf-8" : "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="evento-connections.${format}"`);
    res.send(body);
  }
}
