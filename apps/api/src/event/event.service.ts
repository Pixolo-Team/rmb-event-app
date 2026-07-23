import { randomBytes } from "crypto";
import { BadRequestException, Injectable } from "@nestjs/common";
import { Event, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateEventDto } from "./dto/update-event.dto";

@Injectable()
export class EventService {
  constructor(private readonly prisma: PrismaService) {}

  // Single-row config for the pilot's one event — created lazily on first read.
  async getOrCreate(): Promise<Event> {
    const existing = await this.prisma.event.findFirst();
    return existing ?? this.prisma.event.create({ data: {} });
  }

  // F3.7 — the token behind the printable venue attendance QR. Generated lazily so
  // the admin never has to "turn it on"; the first time it's requested it exists.
  async getVenueCheckinToken(): Promise<string> {
    const event = await this.getOrCreate();
    if (event.venueCheckinToken) return event.venueCheckinToken;
    return this.regenerateVenueCheckinToken();
  }

  // Rotating the token invalidates any printout already in the wild — the admin
  // does this if a QR leaks or between events.
  async regenerateVenueCheckinToken(): Promise<string> {
    const event = await this.getOrCreate();
    const token = randomBytes(18).toString("base64url");
    await this.prisma.event.update({ where: { id: event.id }, data: { venueCheckinToken: token } });
    return token;
  }

  async updateVenue(dto: UpdateEventDto): Promise<Event> {
    const event = await this.getOrCreate();

    if (dto.clearVenue) {
      return this.prisma.event.update({
        where: { id: event.id },
        data: { venueLat: null, venueLng: null },
      });
    }

    const name = dto.name?.trim();
    if (dto.name !== undefined && !name) {
      throw new BadRequestException("Event name is required");
    }

    const nextStartAt = dto.startAt === undefined ? event.startAt : this.parseEventDate(dto.startAt, "startAt");
    const nextEndAt = dto.endAt === undefined ? event.endAt : this.parseEventDate(dto.endAt, "endAt");
    if (nextStartAt && nextEndAt && nextEndAt <= nextStartAt) {
      throw new BadRequestException("Event end time must be after the start time");
    }

    return this.prisma.event.update({
      where: { id: event.id },
      data: {
        ...(name !== undefined && { name }),
        ...(dto.startAt !== undefined && { startAt: nextStartAt }),
        ...(dto.endAt !== undefined && { endAt: nextEndAt }),
        ...(dto.venueLat !== undefined && { venueLat: dto.venueLat }),
        ...(dto.venueLng !== undefined && { venueLng: dto.venueLng }),
        ...(dto.venueAddress !== undefined && { venueAddress: dto.venueAddress?.trim() || null }),
        ...(dto.checkinRadiusM !== undefined && { checkinRadiusM: dto.checkinRadiusM }),
        ...(dto.contactName !== undefined && { contactName: dto.contactName?.trim() || null }),
        ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone?.trim() || null }),
        ...(dto.subtitle !== undefined && { subtitle: dto.subtitle?.trim() || null }),
        ...(dto.chairName !== undefined && { chairName: dto.chairName?.trim() || null }),
        ...(dto.chairTitle !== undefined && { chairTitle: dto.chairTitle?.trim() || null }),
        ...(dto.chairPhotoUrl !== undefined && { chairPhotoUrl: dto.chairPhotoUrl?.trim() || null }),
        ...(dto.registrationUrl !== undefined && { registrationUrl: dto.registrationUrl?.trim() || null }),
        ...(dto.registrationPricing !== undefined && { registrationPricing: dto.registrationPricing?.trim() || null }),
        ...(dto.agenda !== undefined && { agenda: dto.agenda as unknown as Prisma.InputJsonValue }),
      },
    });
  }

  private parseEventDate(value: string | null, field: string): Date | null {
    if (value === null) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} must be a valid date`);
    }
    return date;
  }
}
