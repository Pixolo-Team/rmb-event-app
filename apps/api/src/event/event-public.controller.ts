import { Controller, Get } from "@nestjs/common";
import { EventService } from "./event.service";
import { UploadsService } from "../uploads/uploads.service";

// Venue coordinates aren't sensitive (attendees are physically at the venue) —
// this lets the attendee PWA cache them client-side (PF4) to keep computing
// "am I in radius" offline when /checkin/geolocation can't be reached.
@Controller("event")
export class EventPublicController {
  constructor(
    private readonly eventService: EventService,
    private readonly uploads: UploadsService,
  ) {}

  @Get()
  async get() {
    const event = await this.eventService.getOrCreate();
    const chairPhotoUrl = event.chairPhotoUrl
      ? (await this.uploads.resolveProfilePhotoUrl(event.chairPhotoUrl)) ?? event.chairPhotoUrl
      : null;
    return {
      name: event.name,
      venueLat: event.venueLat,
      venueLng: event.venueLng,
      venueAddress: event.venueAddress,
      checkinRadiusM: event.checkinRadiusM,
      // F3.6 — Home picks its mode (pre-event / arrival / dashboard / ended) from
      // these. They ride along on the already-cached venue payload so the choice
      // still resolves offline; deciding server-side would strand the attendee on
      // a spinner exactly when connectivity is worst.
      startAt: event.startAt?.toISOString() ?? null,
      endAt: event.endAt?.toISOString() ?? null,
      contactName: event.contactName,
      contactPhone: event.contactPhone,
      subtitle: event.subtitle,
      chairName: event.chairName,
      chairTitle: event.chairTitle,
      chairPhotoUrl,
      registrationUrl: event.registrationUrl,
      registrationPricing: event.registrationPricing,
      agenda: event.agenda,
    };
  }
}
