import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Express, Response } from "express";
import { AttendeesService } from "./attendees.service";
import { ResolveOnboardingDto } from "./dto/resolve-onboarding.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { SessionService } from "../session/session.service";
import { SessionGuard, RequestWithAttendee } from "../session/session.guard";
import { avatarUploadOptions } from "./avatar-upload.config";
import { BUSINESS_CATEGORIES, LOOKING_FOR_TAGS, OFFERING_TAGS, GOALS_TAGS } from "./profile-options";

@Controller("attendees")
export class AttendeesController {
  constructor(
    private readonly attendees: AttendeesService,
    private readonly session: SessionService,
  ) {}

  @Get("public/:id")
  async publicProfile(@Param("id") id: string) {
    return this.attendees.getPublicProfile(id);
  }

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
      lookingFor: attendee.lookingFor,
      offering: attendee.offering,
      goals: attendee.goals,
      bio: attendee.bio,
      linkedInUrl: attendee.linkedInUrl,
      qrToken: attendee.qrToken,
      profileCompletedAt: attendee.profileCompletedAt,
    };
  }

  @Post("me/photo")
  @UseGuards(SessionGuard)
  @UseInterceptors(FileInterceptor("photo", avatarUploadOptions))
  async uploadPhoto(@Req() req: RequestWithAttendee, @UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException("No photo uploaded");
    const photoUrl = `/uploads/avatars/${file.filename}`;
    await this.attendees.updatePhoto(req.attendeeId, photoUrl);
    return { status: "ok", photoUrl };
  }

  @Get("directory")
  @UseGuards(SessionGuard)
  async directory(@Req() req: RequestWithAttendee) {
    return this.attendees.getDirectoryForAttendee(req.attendeeId);
  }

  @Patch("me/profile")
  @UseGuards(SessionGuard)
  async updateProfile(@Req() req: RequestWithAttendee, @Body() dto: UpdateProfileDto) {
    const attendee = await this.attendees.updateProfile(req.attendeeId, dto);
    return { status: "ok", profileCompletedAt: attendee.profileCompletedAt };
  }
}
