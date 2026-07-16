import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type ScanResult =
  | { status: "not_found" }
  | { status: "self" }
  | {
      status: "met" | "already_met";
      attendee: { id: string; name: string; businessName: string | null };
    };

@Injectable()
export class MeetingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a confirmed meeting from one QR scan (F4.2). Idempotent: a repeat scan
   * of the same pair (in either direction) returns `already_met` rather than
   * creating a second row, so it's safe to replay from the offline queue.
   */
  async scan(scannerId: string, qrToken: string): Promise<ScanResult> {
    const target = await this.prisma.attendee.findUnique({
      where: { qrToken },
      select: { id: true, name: true, businessName: true },
    });
    if (!target) return { status: "not_found" };
    if (target.id === scannerId) return { status: "self" };

    // Canonical unordered pair so both scan directions map to the same row.
    const [attendeeAId, attendeeBId] = [scannerId, target.id].sort();
    const attendee = { id: target.id, name: target.name, businessName: target.businessName };

    try {
      await this.prisma.meeting.create({
        data: { attendeeAId, attendeeBId, scannedById: scannerId },
      });
      return { status: "met", attendee };
    } catch (error) {
      // Unique-constraint hit → this pair already met (duplicate-pair protection).
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return { status: "already_met", attendee };
      }
      throw error;
    }
  }

  async connections(attendeeId: string) {
    const meetings = await this.prisma.meeting.findMany({
      where: {
        OR: [
          { attendeeAId: attendeeId, attendeeAHidden: false },
          { attendeeBId: attendeeId, attendeeBHidden: false },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        attendeeA: { select: { id: true, name: true, phone: true, email: true, businessName: true, businessCategory: true, bio: true, tableNumber: true, photoUrl: true } },
        attendeeB: { select: { id: true, name: true, phone: true, email: true, businessName: true, businessCategory: true, bio: true, tableNumber: true, photoUrl: true } },
      },
    });

    return {
      connections: meetings.map((meeting) => {
        const viewerIsA = meeting.attendeeAId === attendeeId;
        return {
          ...viewerIsA ? meeting.attendeeB : meeting.attendeeA,
          metAt: meeting.createdAt,
          note: (viewerIsA ? meeting.attendeeANote : meeting.attendeeBNote) ?? "",
        };
      }),
    };
  }

  async updateNote(attendeeId: string, connectionId: string, note: string) {
    const meeting = await this.findConnection(attendeeId, connectionId);
    await this.prisma.meeting.update({
      where: { id: meeting.id },
      data: meeting.attendeeAId === attendeeId ? { attendeeANote: note.trim() || null } : { attendeeBNote: note.trim() || null },
    });
    return { note: note.trim() };
  }

  async removeConnection(attendeeId: string, connectionId: string) {
    const meeting = await this.findConnection(attendeeId, connectionId);
    await this.prisma.meeting.update({
      where: { id: meeting.id },
      data: meeting.attendeeAId === attendeeId ? { attendeeAHidden: true } : { attendeeBHidden: true },
    });
    return { removed: true };
  }

  private async findConnection(attendeeId: string, connectionId: string) {
    const [attendeeAId, attendeeBId] = [attendeeId, connectionId].sort();
    const meeting = await this.prisma.meeting.findUnique({ where: { attendeeAId_attendeeBId: { attendeeAId, attendeeBId } } });
    if (!meeting) throw new NotFoundException("Connection not found");
    return meeting;
  }
}
