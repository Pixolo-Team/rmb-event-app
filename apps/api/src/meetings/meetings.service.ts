import { Injectable } from "@nestjs/common";
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
}
