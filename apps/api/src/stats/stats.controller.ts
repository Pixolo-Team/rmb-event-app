import { Controller, Get, InternalServerErrorException, Query, Req, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AdminGuard } from "../admin-auth/admin.guard";
import { RolesGuard } from "../admin-auth/roles.guard";
import { SessionGuard, RequestWithAttendee } from "../session/session.guard";
import { ExportAnalyticsQueryDto } from "./dto/export-analytics-query.dto";
import { StatsService } from "./stats.service";

@Controller("attendees/me")
@UseGuards(SessionGuard)
export class StatsController {
  constructor(private readonly stats: StatsService) {}
  @Get("stats") get(@Req() req: RequestWithAttendee) { return this.stats.get(req.attendeeId); }
}

// Superadmin-only by RolesGuard's default (no @Roles() needed).
@Controller("admin/analytics")
@UseGuards(AdminGuard, RolesGuard)
export class AdminStatsController {
  constructor(private readonly stats: StatsService) {}
  @Get() get() { return this.stats.getAdminOverview(); }
  @Get("export")
  async export(@Query() query: ExportAnalyticsQueryDto, @Res() res: Response) {
    try {
      const format = query.format === "pdf" ? "pdf" : "csv";
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
