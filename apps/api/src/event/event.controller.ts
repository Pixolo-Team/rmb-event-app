import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../admin-auth/admin.guard";
import { EventService } from "./event.service";
import { UpdateEventDto } from "./dto/update-event.dto";

@Controller("admin/event")
@UseGuards(AdminGuard)
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Get()
  async get() {
    return this.eventService.getOrCreate();
  }

  @Patch()
  async update(@Body() dto: UpdateEventDto) {
    return this.eventService.updateVenue(dto);
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
