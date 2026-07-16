import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { AttendeesService } from "./attendees.service";
import { ResolveOnboardingDto } from "./dto/resolve-onboarding.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { SessionService } from "../session/session.service";
import { SessionGuard, RequestWithAttendee } from "../session/session.guard";

@Controller("attendees")
export class AttendeesController {
  constructor(
    private readonly attendees: AttendeesService,
    private readonly session: SessionService,
  ) {}

  @Get("profile-options")
  profileOptions() {
    return this.attendees.getProfileOptions();
  }

  @Post("onboarding/resolve")
  @HttpCode(HttpStatus.OK)
  async resolveOnboarding(
    @Body() dto: ResolveOnboardingDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.attendees.resolveOnboardingToken(dto.token);
    if (result.kind === "expired") {
      res.status(HttpStatus.UNAUTHORIZED);
      return { status: "expired" };
    }

    this.session.setSessionCookie(res, result.sessionToken);
    return { status: "ok", attendee: result.attendee };
  }

  @Get("me")
  @UseGuards(SessionGuard)
  async me(@Req() req: RequestWithAttendee) {
    const attendee = await this.attendees.getById(req.attendeeId);
    return {
      id: attendee.id,
      name: attendee.name,
      email: attendee.email,
      phone: attendee.phone,
      businessName: attendee.businessName,
      chapterName: attendee.chapter?.name ?? null,
      photoUrl: attendee.photoUrl,
      city: attendee.city,
      businessCategory: attendee.businessCategory,
      tableNumber: attendee.tableNumber,
      lookingFor: attendee.lookingFor,
      offering: attendee.offering,
      goals: attendee.goals,
      bio: attendee.bio,
      // The caller's OWN signed QR token, for rendering their business-card QR
      // (F4.1, Screen 2.11). Only ever returned for `me` — getDirectoryProfile
      // strips qrToken so it is never exposed for other attendees.
      qrToken: attendee.qrToken,
      profileCompletedAt: attendee.profileCompletedAt,
    };
  }

  @Get("directory")
  @UseGuards(SessionGuard)
  async legacyDirectory(@Req() req: RequestWithAttendee) {
    return this.attendees.getDirectoryForAttendee(req.attendeeId);
  }

  @Patch("me/profile")
  @UseGuards(SessionGuard)
  async updateProfile(@Req() req: RequestWithAttendee, @Body() dto: UpdateProfileDto) {
    const attendee = await this.attendees.updateProfile(req.attendeeId, dto);
    return { status: "ok", profileCompletedAt: attendee.profileCompletedAt };
  }

  @Get()
  @UseGuards(SessionGuard)
  directory(@Req() req: RequestWithAttendee) {
    return this.attendees.listDirectory(req.attendeeId);
  }

  @Get(":id")
  @UseGuards(SessionGuard)
  directoryProfile(@Req() req: RequestWithAttendee, @Param("id") id: string) {
    return this.attendees.getDirectoryProfile(req.attendeeId, id);
  }
}
