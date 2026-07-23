import { BadRequestException, Body, Controller, Get, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Express } from "express";
import { AdminGuard } from "../admin-auth/admin.guard";
import { RolesGuard } from "../admin-auth/roles.guard";
import { Roles } from "../admin-auth/roles.decorator";
import { avatarUploadOptions } from "../attendees/avatar-upload.config";
import { EventService } from "./event.service";
import { UpdateEventDto } from "./dto/update-event.dto";

// Superadmin-only by RolesGuard's default (no @Roles() needed).
@Controller("admin/event")
@UseGuards(AdminGuard, RolesGuard)
export class EventController {
  constructor(private readonly eventService: EventService) {}

  // Also read by the Live Check-In page (to show the "venue not configured"
  // banner), so registration staff needs read access here too.
  @Get()
  @Roles("SUPERADMIN", "REGISTRATION_STAFF")
  async get() {
    return this.eventService.getOrCreate();
  }

  @Patch()
  async update(@Body() dto: UpdateEventDto) {
    return this.eventService.updateVenue(dto);
  }

  @Post("chair-photo")
  @UseInterceptors(FileInterceptor("photo", avatarUploadOptions))
  async uploadChairPhoto(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException("No photo uploaded");
    const chairPhotoUrl = `/uploads/avatars/${file.filename}`;
    await this.eventService.updateVenue({ chairPhotoUrl });
    return { status: "ok", chairPhotoUrl };
  }

  @Patch("chair-photo/remove")
  async removeChairPhoto() {
    await this.eventService.updateVenue({ chairPhotoUrl: null });
    return { status: "ok", chairPhotoUrl: null };
  }

  // F3.7 — the token behind the printable venue attendance QR (generated on first
  // read). The admin renders/downloads the QR client-side from this token.
  // Registration staff needs this too — it's what the Live Check-In page renders.
  @Get("venue-qr")
  @Roles("SUPERADMIN", "REGISTRATION_STAFF")
  async venueQr() {
    return { token: await this.eventService.getVenueCheckinToken() };
  }

  @Post("venue-qr/regenerate")
  async regenerateVenueQr() {
    return { token: await this.eventService.regenerateVenueCheckinToken() };
  }
}
