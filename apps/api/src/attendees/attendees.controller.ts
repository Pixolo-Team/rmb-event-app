import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { AttendeesService } from "./attendees.service";
import { ResolveOnboardingDto } from "./dto/resolve-onboarding.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { SessionService } from "../session/session.service";
import { SessionGuard, RequestWithAttendee } from "../session/session.guard";
import { BUSINESS_CATEGORIES, LOOKING_FOR_TAGS, OFFERING_TAGS, GOALS_TAGS } from "./profile-options";

@Controller("attendees")
export class AttendeesController {
  constructor(
    private readonly attendees: AttendeesService,
    private readonly session: SessionService,
  ) {}

  @Get("profile-options")
  profileOptions() {
    return {
      businessCategories: BUSINESS_CATEGORIES,
      lookingFor: LOOKING_FOR_TAGS,
      offering: OFFERING_TAGS,
      goals: GOALS_TAGS,
    };
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
      profileCompletedAt: attendee.profileCompletedAt,
    };
  }

  @Patch("me/profile")
  @UseGuards(SessionGuard)
  async updateProfile(@Req() req: RequestWithAttendee, @Body() dto: UpdateProfileDto) {
    if (!req.attendeeId) throw new UnauthorizedException();
    const attendee = await this.attendees.updateProfile(req.attendeeId, dto);
    return { status: "ok", profileCompletedAt: attendee.profileCompletedAt };
  }
}
