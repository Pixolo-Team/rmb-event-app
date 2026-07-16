import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class BookmarksService {
  constructor(private readonly prisma: PrismaService) {}

  async listForAttendee(attendeeId: string) {
    const bookmarks = await this.prisma.bookmark.findMany({
      where: { attendeeId },
      orderBy: { createdAt: "desc" },
      include: {
        target: {
          include: { chapter: true },
        },
      },
    });

    return bookmarks.map(({ createdAt, target }) => ({
      id: target.id,
      name: target.name,
      businessName: target.businessName,
      chapterName: target.chapter?.name ?? null,
      city: target.city,
      businessCategory: target.businessCategory,
      bio: target.bio,
      phone: target.phone,
      photoUrl: target.photoUrl,
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
      select: { id: true },
    });
    if (!target) throw new NotFoundException("Attendee not found");

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
}
