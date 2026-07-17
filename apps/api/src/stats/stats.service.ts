import { Injectable } from "@nestjs/common";
import type { Event } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { LeaderboardService } from "../leaderboard/leaderboard.service";
import { EventService } from "../event/event.service";

type HourlySeriesPoint = {
  label: string;
  checkIns: number;
  meetings: number;
};

@Injectable()
export class StatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaderboard: LeaderboardService,
    private readonly eventService: EventService,
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

  // F11.2 — organizer overview over attendance, networking activity and sentiment.
  async getAdminOverview() {
    const [event, totalAttendees, checkedIns, meetings, photosCount, likesCount, feedback, leaderboard] =
      await Promise.all([
        this.eventService.getOrCreate(),
        this.prisma.attendee.count(),
        this.prisma.checkIn.findMany({ orderBy: { createdAt: "asc" }, select: { attendeeId: true, method: true, createdAt: true } }),
        this.prisma.meeting.findMany({ orderBy: { createdAt: "asc" }, select: { attendeeAId: true, attendeeBId: true, createdAt: true } }),
        this.prisma.photo.count(),
        this.prisma.like.count(),
        this.prisma.feedback.findMany({ select: { rating: true, createdAt: true } }),
        this.leaderboard.getVenueDisplay(),
      ]);

    const checkedInCount = checkedIns.length;
    const checkedInIds = new Set(checkedIns.map((checkIn) => checkIn.attendeeId));
    const breakdown = { GEOLOCATION: 0, MANUAL: 0, STAFF_QR: 0 } as Record<"GEOLOCATION" | "MANUAL" | "STAFF_QR", number>;
    for (const checkIn of checkedIns) breakdown[checkIn.method]++;

    const engagedCheckedIn = new Set<string>();
    for (const meeting of meetings) {
      if (checkedInIds.has(meeting.attendeeAId)) engagedCheckedIn.add(meeting.attendeeAId);
      if (checkedInIds.has(meeting.attendeeBId)) engagedCheckedIn.add(meeting.attendeeBId);
    }

    const averageMeetingsPerCheckedIn = checkedInCount ? (meetings.length * 2) / checkedInCount : 0;
    const checkInPercent = totalAttendees ? (checkedInCount / totalAttendees) * 100 : 0;
    const engagementPercent = checkedInCount ? (engagedCheckedIn.size / checkedInCount) * 100 : 0;
    const averageFeedbackRating = feedback.length
      ? feedback.reduce((sum, row) => sum + row.rating, 0) / feedback.length
      : 0;

    const hourly = this.buildHourlySeries(event, checkedIns, meetings);
    const now = new Date();
    const eventState =
      event.startAt && event.startAt.getTime() > now.getTime() && checkedInCount === 0 && meetings.length === 0
        ? "upcoming"
        : event.endAt && event.endAt.getTime() < now.getTime()
          ? "ended"
          : "live";

    return {
      generatedAt: now.toISOString(),
      event: {
        name: event.name,
        startAt: event.startAt?.toISOString() ?? null,
        endAt: event.endAt?.toISOString() ?? null,
        state: eventState,
      },
      totals: {
        attendees: totalAttendees,
        checkedIn: checkedInCount,
        notCheckedIn: Math.max(totalAttendees - checkedInCount, 0),
        meetings: meetings.length,
        averageMeetingsPerCheckedIn,
        checkInPercent,
        engagementPercent,
        engagedCheckedIn: engagedCheckedIn.size,
        photos: photosCount,
        likes: likesCount,
        feedbackResponses: feedback.length,
        feedbackAverage: averageFeedbackRating,
      },
      breakdown,
      topConnectors: leaderboard.top.slice(0, 5).map((entry) => ({
        id: entry.id,
        rank: entry.rank,
        name: entry.name,
        businessName: entry.businessName,
        metCount: entry.metCount,
      })),
      timeseries: {
        windowLabel: "Last 8 hours",
        points: hourly,
      },
    };
  }

  private buildHourlySeries(
    event: Event,
    checkIns: { createdAt: Date }[],
    meetings: { createdAt: Date }[],
  ): HourlySeriesPoint[] {
    const HOUR_MS = 60 * 60 * 1000;
    const now = new Date();
    const allActivity = [...checkIns, ...meetings];
    const latestActivity = allActivity.length ? allActivity[allActivity.length - 1].createdAt : now;
    const anchor = event.endAt && event.endAt.getTime() < now.getTime() ? event.endAt : latestActivity;
    const end = new Date(anchor);
    end.setMinutes(0, 0, 0);

    const start = new Date(end.getTime() - HOUR_MS * 7);
    const buckets = Array.from({ length: 8 }, (_, index) => {
      const bucketStart = new Date(start.getTime() + HOUR_MS * index);
      return {
        label: bucketStart.toLocaleTimeString([], { hour: "numeric" }),
        checkIns: 0,
        meetings: 0,
      };
    });

    for (const checkIn of checkIns) {
      const index = Math.floor((checkIn.createdAt.getTime() - start.getTime()) / HOUR_MS);
      if (index >= 0 && index < buckets.length) buckets[index].checkIns++;
    }

    for (const meeting of meetings) {
      const index = Math.floor((meeting.createdAt.getTime() - start.getTime()) / HOUR_MS);
      if (index >= 0 && index < buckets.length) buckets[index].meetings++;
    }

    return buckets;
  }
}
