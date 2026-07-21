import { randomBytes } from "crypto";
import { BadRequestException, Injectable } from "@nestjs/common";
import { Event } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateEventDto } from "./dto/update-event.dto";

// Read constantly (every Home load, every check-in, every /event ping) but
// written rarely (only via admin's updateVenue/regenerate). Cache the row for
// a few seconds and drop the cache on every write below — cheap staleness
// insurance, and it turns the overwhelming majority of reads into zero DB
// round trips instead of one ~700ms pooled-connection hit each.
const EVENT_CACHE_TTL_MS = 10_000;

@Injectable()
export class EventService {
  private cached: { value: Event; expiresAt: number } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  // Single-row config for the pilot's one event — created lazily on first read.
  async getOrCreate(): Promise<Event> {
    if (this.cached && this.cached.expiresAt > Date.now()) return this.cached.value;

    const existing = await this.prisma.event.findFirst();
    const value = existing ?? (await this.prisma.event.create({ data: {} }));
    this.cached = { value, expiresAt: Date.now() + EVENT_CACHE_TTL_MS };
    return value;
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
    const updated = await this.prisma.event.update({ where: { id: event.id }, data: { venueCheckinToken: token } });
    this.cached = { value: updated, expiresAt: Date.now() + EVENT_CACHE_TTL_MS };
    return token;
  }

  async updateVenue(dto: UpdateEventDto): Promise<Event> {
    const event = await this.getOrCreate();

    if (dto.clearVenue) {
      const updated = await this.prisma.event.update({
        where: { id: event.id },
        data: { venueLat: null, venueLng: null },
      });
      this.cached = { value: updated, expiresAt: Date.now() + EVENT_CACHE_TTL_MS };
      return updated;
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

    const updated = await this.prisma.event.update({
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
      },
    });
    this.cached = { value: updated, expiresAt: Date.now() + EVENT_CACHE_TTL_MS };
    return updated;
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
