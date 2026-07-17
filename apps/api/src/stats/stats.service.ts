import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LeaderboardService } from "../leaderboard/leaderboard.service";

@Injectable()
export class StatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaderboard: LeaderboardService,
  ) {}

  // F11.1 — the attendee's own five personal figures, aggregated in one round-trip.
  async get(attendeeId: string) {
    const [peopleMet, bookmarks, photos, checkIn, event, board] = await Promise.all([
      // Counted the same way the leaderboard counts meetings, so "people met" and rank never disagree.
      this.prisma.meeting.count({ where: { OR: [{ attendeeAId: attendeeId }, { attendeeBId: attendeeId }] } }),
      this.prisma.bookmark.count({ where: { attendeeId } }),
      // Photos are hard-deleted (with a DeletedPhotoLog), so a live count always matches what the feed shows.
      this.prisma.photo.count({ where: { attendeeId } }),
      this.prisma.checkIn.findUnique({ where: { attendeeId }, select: { createdAt: true, method: true } }),
      this.prisma.event.findFirst({ orderBy: { createdAt: "desc" }, select: { endAt: true } }),
      // Reuse the leaderboard's tie-aware ranking + 5s cache rather than re-deriving rank here.
      this.leaderboard.getForAttendee(attendeeId),
    ]);

    return {
      peopleMet,
      rank: board.me?.rank ?? board.totalAttendees + 1,
      totalRanked: board.totalAttendees,
      bookmarks,
      photos,
      // Return the raw check-in time + event end so the client renders a live-ticking
      // "time at event" (min(now, eventEndAt) − checkedInAt) that keeps counting offline.
      checkedInAt: checkIn?.createdAt.toISOString() ?? null,
      checkInMethod: checkIn?.method ?? null,
      eventEndAt: event?.endAt?.toISOString() ?? null,
      generatedAt: new Date().toISOString(),
    };
  }
}
