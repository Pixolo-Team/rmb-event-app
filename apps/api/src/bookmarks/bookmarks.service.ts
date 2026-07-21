import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class BookmarksService {
  constructor(private readonly prisma: PrismaService) {}

  async listForAttendee(attendeeId: string) {
    const [bookmarks, meetings] = await Promise.all([
      this.prisma.bookmark.findMany({
        where: { attendeeId, target: { deletedAt: null } },
        orderBy: { createdAt: "desc" },
        include: {
          target: {
            include: { chapter: true },
          },
        },
      }),
      this.prisma.meeting.findMany({
        where: { OR: [{ attendeeAId: attendeeId }, { attendeeBId: attendeeId }] },
        select: { attendeeAId: true, attendeeBId: true },
      }),
    ]);

    const metIds = new Set(
      meetings.map((meeting) => (meeting.attendeeAId === attendeeId ? meeting.attendeeBId : meeting.attendeeAId)),
    );

    return bookmarks.map(({ createdAt, target }) => ({
      id: target.id,
      name: target.name,
      businessName: target.businessName,
      chapterName: target.chapter?.name ?? null,
      city: target.city,
      businessCategory: target.businessCategory,
      bio: target.bio,
      phone: target.phone,
      email: target.email,
      tableNumber: target.tableNumber,
      photoUrl: target.photoUrl,
      linkedInUrl: target.linkedInUrl,
      websiteUrl: target.websiteUrl,
      met: metIds.has(target.id),
      bookmarkedAt: createdAt,
      bookmarked: true,
    }));
  }

  async toggle(attendeeId: string, targetId: string) {
    if (attendeeId === targetId) {
      throw new BadRequestException("You can't bookmark yourself.");
    }

    const target = await this.prisma.attendee.findUnique({
      where: { id: targetId },
      select: { id: true, deletedAt: true },
    });
    if (!target || target.deletedAt) throw new NotFoundException("Attendee not found");

    const existing = await this.prisma.bookmark.findUnique({
      where: {
        attendeeId_targetId: {
          attendeeId,
          targetId,
        },
      },
    });

    if (existing) {
      await this.prisma.bookmark.delete({
        where: {
          attendeeId_targetId: {
            attendeeId,
            targetId,
          },
        },
      });
      return { bookmarked: false };
    }

    await this.prisma.bookmark.create({
      data: {
        attendeeId,
        targetId,
      },
    });
    return { bookmarked: true };
  }

  async set(attendeeId: string, targetId: string, bookmarked: boolean) {
    if (attendeeId === targetId) throw new BadRequestException("You can't bookmark yourself.");
    const target = await this.prisma.attendee.findUnique({ where: { id: targetId }, select: { id: true, deletedAt: true } });
    if (!target || target.deletedAt) throw new NotFoundException("Attendee not found");

    if (bookmarked) {
      await this.prisma.bookmark.upsert({
        where: { attendeeId_targetId: { attendeeId, targetId } },
        create: { attendeeId, targetId },
        update: {},
      });
    } else {
      await this.prisma.bookmark.deleteMany({ where: { attendeeId, targetId } });
    }
  }
}
