import { Injectable } from "@nestjs/common";
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

    return this.prisma.event.update({
      where: { id: event.id },
      data: {
        ...(dto.venueLat !== undefined && { venueLat: dto.venueLat }),
        ...(dto.venueLng !== undefined && { venueLng: dto.venueLng }),
        ...(dto.checkinRadiusM !== undefined && { checkinRadiusM: dto.checkinRadiusM }),
      },
    });
  }
}
