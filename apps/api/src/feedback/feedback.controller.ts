import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { SessionGuard, RequestWithAttendee } from "../session/session.guard";
import { AdminGuard } from "../admin-auth/admin.guard";
import { RolesGuard } from "../admin-auth/roles.guard";
import { CreateFeedbackDto } from "./dto/create-feedback.dto";
import { AdminFeedbackQueryDto } from "./dto/admin-feedback-query.dto";
import { FeedbackService } from "./feedback.service";
import { RateLimit } from "../common/rate-limit/rate-limit.decorator";
import { RateLimitGuard } from "../common/rate-limit/rate-limit.guard";

@Controller("feedback") 
@UseGuards(SessionGuard, RateLimitGuard)
export class FeedbackController { 
  constructor(private readonly feedback:FeedbackService){} 
  @Post() 
  @RateLimit(5)
  submit(@Req() req:RequestWithAttendee,@Body() dto:CreateFeedbackDto){
    return this.feedback.submit(req.attendeeId,dto.rating,dto.comment);
  } 
}
// Superadmin-only by RolesGuard's default (no @Roles() needed).
@Controller("admin/feedback") @UseGuards(AdminGuard, RolesGuard)
export class AdminFeedbackController { 
  constructor(private readonly feedback:FeedbackService){} 
  @Get() 
  list(@Query() query: AdminFeedbackQueryDto) {
    return this.feedback.analytics(query.search ?? "", query.rating);
  } 
  @Get("export") 
  async export(@Res() res:Response){
    res.setHeader("Content-Type","text/csv; charset=utf-8");
    res.setHeader("Content-Disposition",'attachment; filename="evento-feedback.csv"');
    res.send(await this.feedback.csv());
  } 
}
