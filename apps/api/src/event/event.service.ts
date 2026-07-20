import { BadRequestException, Injectable } from "@nestjs/common";
import { Event } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateEventDto } from "./dto/update-event.dto";

@Injectable()
export class EventService {
  constructor(private readonly prisma: PrismaService) {}

  // Single-row config for the pilot's one event — created lazily on first read.
  async getOrCreate(): Promise<Event> {
    const existing = await this.prisma.event.findFirst();
    if (existing) return existing;
    return this.prisma.event.create({ data: {} });
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
        ...(dto.checkinRadiusM !== undefined && { checkinRadiusM: dto.checkinRadiusM }),
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
