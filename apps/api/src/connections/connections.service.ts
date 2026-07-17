import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

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
  constructor(private readonly prisma: PrismaService) {}

  /** Records a mutual meeting between the scanner and the owner of the scanned QR token. */
  async scan(attendeeId: string, qrToken: string): Promise<{ met: true; attendee: ConnectionAttendeeData }> {
    const target = await this.prisma.attendee.findUnique({
      where: { qrToken },
      include: { chapter: true },
    });
    if (!target) throw new NotFoundException("That QR code isn't recognised");
    if (target.id === attendeeId) throw new BadRequestException("That's your own QR code");

    // Canonicalize the pair so it's stored once regardless of who scanned whom.
    const [attendeeAId, attendeeBId] = [attendeeId, target.id].sort();

    const meeting = await this.prisma.meeting.upsert({
      where: { attendeeAId_attendeeBId: { attendeeAId, attendeeBId } },
      create: { attendeeAId, attendeeBId },
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
        metAt: meeting.metAt,
      },
    };
  }

  /** Everyone the attendee has met, most recent first. */
  async listForAttendee(attendeeId: string): Promise<ConnectionAttendeeData[]> {
    const meetings = await this.prisma.meeting.findMany({
      where: { OR: [{ attendeeAId: attendeeId }, { attendeeBId: attendeeId }] },
      orderBy: { metAt: "desc" },
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
        metAt: meeting.metAt,
      };
    });
  }
}
