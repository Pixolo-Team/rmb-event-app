import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../admin-auth/admin.guard";
import { EventService } from "./event.service";
import { UpdateEventDto } from "./dto/update-event.dto";
import { UpdateChairPhotoDto } from "./dto/update-chair-photo.dto";
import { UploadsService, ADMIN_UPLOAD_OWNER } from "../uploads/uploads.service";
import { UploadCategories } from "../uploads/upload.types";
import { CreateUploadUrlRequestData } from "../uploads/dto/create-upload-url.request";

@Controller("admin/event")
@UseGuards(AdminGuard)
export class EventController {
  constructor(
    private readonly eventService: EventService,
    private readonly uploads: UploadsService,
  ) {}

  @Get()
  async get() {
    const event = await this.eventService.getOrCreate();
    return {
      ...event,
      chairPhotoUrl: event.chairPhotoUrl
        ? (await this.uploads.resolveProfilePhotoUrl(event.chairPhotoUrl)) ?? event.chairPhotoUrl
        : null,
    };
  }

  @Patch()
  async update(@Body() dto: UpdateEventDto) {
    return this.eventService.updateVenue(dto);
  }

  /**
   * Generates a signed GCS upload URL for the chair photo. AdminGuard has no
   * attendeeId concept, so this is owned by a fixed marker segment instead
   * of a real attendee, reusing the Profile category (a single image).
   */
  @Post("chair-photo/upload-url")
  async createChairPhotoUploadUrl(@Body() dto: CreateUploadUrlRequestData) {
    const upload = await this.uploads.createUploadUrlService(ADMIN_UPLOAD_OWNER, {
      category: UploadCategories.Profile,
      contentType: dto.contentType,
    });
    return { status: "ok", upload };
  }

  /**
   * Persists the chair photo objectPath already uploaded directly to GCS via
   * the endpoint above, after verifying it server-side.
   */
  @Patch("chair-photo")
  async updateChairPhoto(@Body() dto: UpdateChairPhotoDto) {
    await this.uploads.completeUploadService(ADMIN_UPLOAD_OWNER, UploadCategories.Profile, dto.objectPath);

    const previous = await this.eventService.getOrCreate();
    await this.eventService.updateVenue({ chairPhotoUrl: dto.objectPath });
    if (previous.chairPhotoUrl && previous.chairPhotoUrl !== dto.objectPath) {
      await this.uploads.deleteUploadService(ADMIN_UPLOAD_OWNER, previous.chairPhotoUrl).catch(() => undefined);
    }

    const chairPhotoUrl = await this.uploads.resolveProfilePhotoUrl(dto.objectPath);
    return { status: "ok", chairPhotoUrl };
  }

  @Patch("chair-photo/remove")
  async removeChairPhoto() {
    const previous = await this.eventService.getOrCreate();
    await this.eventService.updateVenue({ chairPhotoUrl: null });
    if (previous.chairPhotoUrl) {
      await this.uploads.deleteUploadService(ADMIN_UPLOAD_OWNER, previous.chairPhotoUrl).catch(() => undefined);
    }
    return { status: "ok", chairPhotoUrl: null };
  }

  // F3.7 — the token behind the printable venue attendance QR (generated on first
  // read). The admin renders/downloads the QR client-side from this token.
  @Get("venue-qr")
  async venueQr() {
    return { token: await this.eventService.getVenueCheckinToken() };
  }

  @Post("venue-qr/regenerate")
  async regenerateVenueQr() {
    return { token: await this.eventService.regenerateVenueCheckinToken() };
  }
}
