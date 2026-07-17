import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { SessionGuard, RequestWithAttendee } from "../session/session.guard";
import { AdminGuard } from "../admin-auth/admin.guard";
import { CreateFeedbackDto } from "./dto/create-feedback.dto";
import { FeedbackService } from "./feedback.service";

@Controller("feedback") @UseGuards(SessionGuard)
export class FeedbackController { constructor(private readonly feedback:FeedbackService){} @Post() submit(@Req() req:RequestWithAttendee,@Body() dto:CreateFeedbackDto){return this.feedback.submit(req.attendeeId,dto.rating,dto.comment);} }
@Controller("admin/feedback") @UseGuards(AdminGuard)
export class AdminFeedbackController { constructor(private readonly feedback:FeedbackService){} @Get() list(@Query("search") search?:string,@Query("rating") rating?:string){return this.feedback.analytics(search??"",rating?Number(rating):undefined);} @Get("export") async export(@Res() res:Response){res.setHeader("Content-Type","text/csv; charset=utf-8");res.setHeader("Content-Disposition",'attachment; filename="evento-feedback.csv"');res.send(await this.feedback.csv());} }
