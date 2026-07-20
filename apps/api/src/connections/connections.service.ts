import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { QRSigningService } from "../qr/qr-signing.service";

export type ConnectionAttendeeData = {
  id: string;
  name: string;
  businessName: string | null;
  chapterName: string | null;
  city: string | null;
  businessCategory: string | null;
  bio: string | null;
  phone: string;
  photoUrl: string | null;
  linkedInUrl: string | null;
  metAt: Date;
};

@Injectable()
export class ConnectionsService {
  private readonly logger = new Logger(ConnectionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly qrSigning: QRSigningService,
  ) {}

  /** Records a mutual meeting between the scanner and the owner of the scanned QR token. */
  async scan(attendeeId: string, qrToken: string): Promise<{ met: true; attendee: ConnectionAttendeeData }> {
    // First, try to verify as a signed JWT token (PF5)
    const payload = this.qrSigning.verify(qrToken);
    let targetId: string;

    if (payload) {
      // Valid signed JWT — use the attendeeId from payload
      targetId = payload.attendeeId;
    } else {
      // Fall back to DB lookup for legacy tokens (backward compatibility)
      const target = await this.prisma.attendee.findUnique({
        where: { qrToken },
        select: { id: true, deletedAt: true },
      });
      if (!target || target.deletedAt) throw new NotFoundException("That QR code isn't recognised");
      targetId = target.id;
    }

    if (targetId === attendeeId) throw new BadRequestException("That's your own QR code");

    const target = await this.prisma.attendee.findUnique({
      where: { id: targetId },
      include: { chapter: true },
    });
    if (!target || target.deletedAt) throw new NotFoundException("That QR code isn't recognised");

    // Canonicalize the pair so it's stored once regardless of who scanned whom.
    const [attendeeAId, attendeeBId] = [attendeeId, target.id].sort();

    const meeting = await this.prisma.meeting.upsert({
      where: { attendeeAId_attendeeBId: { attendeeAId, attendeeBId } },
      create: { attendeeAId, attendeeBId, scannedById: attendeeId },
      update: {},
    });

    return {
      met: true,
      attendee: {
        id: target.id,
        name: target.name,
        businessName: target.businessName,
        chapterName: target.chapter?.name ?? null,
        city: target.city,
        businessCategory: target.businessCategory,
        bio: target.bio,
        phone: target.phone,
        photoUrl: target.photoUrl,
        linkedInUrl: target.linkedInUrl,
        metAt: meeting.createdAt,
      },
    };
  }

  /** Everyone the attendee has met, most recent first. */
  async listForAttendee(attendeeId: string): Promise<ConnectionAttendeeData[]> {
    const meetings = await this.prisma.meeting.findMany({
      where: { OR: [{ attendeeAId: attendeeId }, { attendeeBId: attendeeId }] },
      orderBy: { createdAt: "desc" },
      include: {
        attendeeA: { include: { chapter: true } },
        attendeeB: { include: { chapter: true } },
      },
    });

    return meetings.map((meeting) => {
      const other = meeting.attendeeAId === attendeeId ? meeting.attendeeB : meeting.attendeeA;
      return {
        id: other.id,
        name: other.name,
        businessName: other.businessName,
        chapterName: other.chapter?.name ?? null,
        city: other.city,
        businessCategory: other.businessCategory,
        bio: other.bio,
        phone: other.phone,
        photoUrl: other.photoUrl,
        linkedInUrl: other.linkedInUrl,
        metAt: meeting.createdAt,
      };
    });
  }
}
