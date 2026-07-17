import { Controller, Get, InternalServerErrorException, Query, Req, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AdminGuard } from "../admin-auth/admin.guard";
import { SessionGuard, RequestWithAttendee } from "../session/session.guard";
import { StatsService } from "./stats.service";

@Controller("attendees/me")
@UseGuards(SessionGuard)
export class StatsController {
  constructor(private readonly stats: StatsService) {}
  @Get("stats") get(@Req() req: RequestWithAttendee) { return this.stats.get(req.attendeeId); }
}

@Controller("admin/analytics")
@UseGuards(AdminGuard)
export class AdminStatsController {
  constructor(private readonly stats: StatsService) {}
  @Get() get() { return this.stats.getAdminOverview(); }
  @Get("export")
  async export(@Query("format") requested: string | undefined, @Res() res: Response) {
    try {
      const format = requested === "pdf" ? "pdf" : "csv";
      res.setHeader("Content-Type", format === "pdf" ? "application/pdf" : "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="evento-admin-analytics.${format}"`);
      const payload = await this.stats.exportAdminOverview(format);
      res.send(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to export analytics";
      throw new InternalServerErrorException(message);
    }
  }
}
