import {
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
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { AttendeesService } from "./attendees.service";
import { ResolveOnboardingDto } from "./dto/resolve-onboarding.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UpdateLinksDto } from "./dto/update-links.dto";
import { UpdatePhotoDto } from "./dto/update-photo.dto";
import { SessionService } from "../session/session.service";
import { SessionGuard, RequestWithAttendee } from "../session/session.guard";
import { UploadsService } from "../uploads/uploads.service";
import { UploadCategories } from "../uploads/upload.types";

@Controller("attendees")
export class AttendeesController {
  constructor(
    private readonly attendees: AttendeesService,
    private readonly session: SessionService,
    private readonly uploads: UploadsService,
  ) {}

  @Get("public/:id")
  async publicProfile(@Param("id") id: string) {
    return this.attendees.getPublicProfile(id);
  }

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
    const photoUrl = await this.attendees.resolvePhotoUrlPublic(attendee.photoUrl);
    return {
      id: attendee.id,
      name: attendee.name,
      email: attendee.email,
      phone: attendee.phone,
      businessName: attendee.businessName,
      chapterName: attendee.chapter?.name ?? null,
      photoUrl,
      city: attendee.city,
      businessCategory: attendee.businessCategory,
      tableNumber: attendee.tableNumber,
      lookingFor: attendee.lookingFor,
      offering: attendee.offering,
      goals: attendee.goals,
      bio: attendee.bio,
      linkedInUrl: attendee.linkedInUrl,
      websiteUrl: attendee.websiteUrl,
      // The caller's OWN signed QR token, for rendering their business-card QR
      // (F4.1, Screen 2.11). Only ever returned for `me` — getDirectoryProfile
      // strips qrToken so it is never exposed for other attendees.
      qrToken: attendee.qrToken,
      profileCompletedAt: attendee.profileCompletedAt,
    };
  }

  /**
   * Persists a profile photo already uploaded directly to GCS via the
   * /uploads/upload-url flow. Verifies the object (content type + size)
   * before saving its path, then returns a fresh signed URL to display it.
   */
  @Patch("me/photo")
  @UseGuards(SessionGuard)
  async updatePhoto(@Req() req: RequestWithAttendee, @Body() dto: UpdatePhotoDto) {
    await this.uploads.completeUploadService(
      req.attendeeId,
      UploadCategories.Profile,
      dto.objectPath,
    );
    await this.attendees.updatePhoto(req.attendeeId, dto.objectPath);
    const photoUrl = await this.attendees.resolvePhotoUrlPublic(dto.objectPath);
    return { status: "ok", photoUrl };
  }

  @Patch("me/photo/remove")
  @UseGuards(SessionGuard)
  async removePhoto(@Req() req: RequestWithAttendee) {
    await this.attendees.updatePhoto(req.attendeeId, null);
    return { status: "ok", photoUrl: null };
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

  // Partial edit of the optional profile links (e.g. the /profile website editor),
  // without re-sending the full onboarding profile.
  @Patch("me/links")
  @UseGuards(SessionGuard)
  async updateLinks(@Req() req: RequestWithAttendee, @Body() dto: UpdateLinksDto) {
    const links = await this.attendees.updateLinks(req.attendeeId, dto);
    return { status: "ok", ...links };
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
