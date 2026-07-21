import { Injectable } from "@nestjs/common";
import type { Event } from "@prisma/client";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { PrismaService } from "../prisma/prisma.service";
import { LeaderboardService } from "../leaderboard/leaderboard.service";
import { EventService } from "../event/event.service";

type HourlySeriesPoint = {
  label: string;
  checkIns: number;
  meetings: number;
};

type AdminOverview = {
  generatedAt: string;
  event: {
    name: string;
    startAt: string | null;
    endAt: string | null;
    state: "upcoming" | "live" | "ended";
  };
  totals: {
    attendees: number;
    checkedIn: number;
    notCheckedIn: number;
    meetings: number;
    averageMeetingsPerCheckedIn: number;
    checkInPercent: number;
    engagementPercent: number;
    engagedCheckedIn: number;
    photos: number;
    likes: number;
    feedbackResponses: number;
    feedbackAverage: number;
  };
  breakdown: Record<"GEOLOCATION" | "MANUAL" | "STAFF_QR" | "VENUE_QR", number>;
  topConnectors: {
    id: string;
    rank: number;
    name: string;
    businessName: string | null;
    metCount: number;
  }[];
  timeseries: {
    windowLabel: string;
    points: HourlySeriesPoint[];
  };
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
    return this.buildAdminOverview();
  }

  async exportAdminOverview(format: "csv" | "pdf") {
    const overview = await this.buildAdminOverview();
    return format === "pdf" ? buildAnalyticsPdf(overview) : buildAnalyticsCsv(overview);
  }

  private async buildAdminOverview(): Promise<AdminOverview> {
    const event = await this.eventService.getOrCreate();
    const totalAttendees = await this.prisma.attendee.count({ where: { deletedAt: null } });
    const checkedIns = await this.prisma.checkIn.findMany({
      where: { attendee: { deletedAt: null } },
      orderBy: { createdAt: "asc" },
      select: { attendeeId: true, method: true, createdAt: true },
    });
    const meetings = await this.prisma.meeting.findMany({
      where: { attendeeA: { deletedAt: null }, attendeeB: { deletedAt: null } },
      orderBy: { createdAt: "asc" },
      select: { attendeeAId: true, attendeeBId: true, createdAt: true },
    });
    const photosCount = await this.prisma.photo.count();
    const likesCount = await this.prisma.like.count();
    const feedback = await this.prisma.feedback.findMany({ select: { rating: true, createdAt: true } });
    const checkedInAttendees = await this.prisma.attendee.findMany({
      where: { checkIn: { isNot: null }, deletedAt: null },
      select: { id: true, name: true, businessName: true },
    });

    const checkedInCount = checkedIns.length;
    const checkedInIds = new Set(checkedIns.map((checkIn) => checkIn.attendeeId));
    const breakdown = { GEOLOCATION: 0, MANUAL: 0, STAFF_QR: 0, VENUE_QR: 0 } as Record<"GEOLOCATION" | "MANUAL" | "STAFF_QR" | "VENUE_QR", number>;
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
    const topConnectors = this.buildTopConnectors(checkedInAttendees, meetings);
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
      topConnectors,
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

  private buildTopConnectors(
    attendees: { id: string; name: string; businessName: string | null }[],
    meetings: { attendeeAId: string; attendeeBId: string }[],
  ) {
    const counts = new Map<string, number>();
    for (const meeting of meetings) {
      counts.set(meeting.attendeeAId, (counts.get(meeting.attendeeAId) ?? 0) + 1);
      counts.set(meeting.attendeeBId, (counts.get(meeting.attendeeBId) ?? 0) + 1);
    }

    let previousCount: number | null = null;
    let currentRank = 0;

    return attendees
      .map((attendee) => ({ ...attendee, metCount: counts.get(attendee.id) ?? 0 }))
      .sort((a, b) => b.metCount - a.metCount || a.name.localeCompare(b.name))
      .map((attendee, index) => {
        if (attendee.metCount !== previousCount) currentRank = index + 1;
        previousCount = attendee.metCount;
        return {
          id: attendee.id,
          rank: currentRank,
          name: attendee.name,
          businessName: attendee.businessName,
          metCount: attendee.metCount,
        };
      })
      .slice(0, 5);
  }
}

function buildAnalyticsCsv(overview: AdminOverview) {
  const rows: string[][] = [
    ["Section", "Metric", "Value"],
    ["Event", "Name", overview.event.name],
    ["Event", "State", overview.event.state],
    ["Event", "Starts at", overview.event.startAt ?? ""],
    ["Event", "Ends at", overview.event.endAt ?? ""],
    ["Event", "Generated at", overview.generatedAt],
    ["Overview", "Registered attendees", String(overview.totals.attendees)],
    ["Overview", "Checked in", String(overview.totals.checkedIn)],
    ["Overview", "Not checked in", String(overview.totals.notCheckedIn)],
    ["Overview", "Check-in percent", formatPercent(overview.totals.checkInPercent)],
    ["Overview", "Meetings logged", String(overview.totals.meetings)],
    ["Overview", "Average meetings per checked-in attendee", overview.totals.averageMeetingsPerCheckedIn.toFixed(1)],
    ["Overview", "Engaged checked-in attendees", String(overview.totals.engagedCheckedIn)],
    ["Overview", "Engagement percent", formatPercent(overview.totals.engagementPercent)],
    ["Overview", "Photos", String(overview.totals.photos)],
    ["Overview", "Likes", String(overview.totals.likes)],
    ["Overview", "Feedback responses", String(overview.totals.feedbackResponses)],
    ["Overview", "Feedback average", overview.totals.feedbackAverage.toFixed(1)],
    [],
    ["Check-in methods", "Method", "Count"],
    ["Check-in methods", "Geolocation", String(overview.breakdown.GEOLOCATION)],
    ["Check-in methods", "Manual", String(overview.breakdown.MANUAL)],
    ["Check-in methods", "Staff QR", String(overview.breakdown.STAFF_QR)],
    [],
    ["Top connectors", "Rank", "Name", "Company", "Meetings"],
    ...overview.topConnectors.map((entry) => [
      "Top connectors",
      String(entry.rank),
      entry.name,
      entry.businessName ?? "",
      String(entry.metCount),
    ]),
    [],
    ["Time series", "Hour", "Check-ins", "Meetings"],
    ...overview.timeseries.points.map((point) => [
      "Time series",
      point.label,
      String(point.checkIns),
      String(point.meetings),
    ]),
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

async function buildAnalyticsPdf(overview: AdminOverview) {
  const timestamp = formatDateTime(overview.generatedAt);
  const lines = [
    "Evento Admin Analytics Report",
    "",
    `Event: ${overview.event.name}`,
    `Status: ${titleCase(overview.event.state)}`,
    `Generated: ${timestamp}`,
    `Window: ${overview.timeseries.windowLabel}`,
    "",
    "Overview",
    `Registered attendees: ${overview.totals.attendees}`,
    `Checked in: ${overview.totals.checkedIn} (${formatPercent(overview.totals.checkInPercent)})`,
    `Not checked in: ${overview.totals.notCheckedIn}`,
    `Meetings logged: ${overview.totals.meetings}`,
    `Avg meetings per checked-in attendee: ${overview.totals.averageMeetingsPerCheckedIn.toFixed(1)}`,
    `Networking engagement: ${overview.totals.engagedCheckedIn} attendees (${formatPercent(overview.totals.engagementPercent)})`,
    `Photos shared: ${overview.totals.photos}`,
    `Photo likes: ${overview.totals.likes}`,
    `Feedback responses: ${overview.totals.feedbackResponses}`,
    `Average feedback rating: ${overview.totals.feedbackAverage.toFixed(1)} / 5`,
    "",
    "Check-in Methods",
    `Geolocation: ${overview.breakdown.GEOLOCATION}`,
    `Manual: ${overview.breakdown.MANUAL}`,
    `Staff QR: ${overview.breakdown.STAFF_QR}`,
    "",
    "Top Connectors",
    ...(overview.topConnectors.length
      ? overview.topConnectors.map(
          (entry) => `#${entry.rank} ${entry.name} - ${entry.businessName ?? "Attendee"} - ${entry.metCount} meetings`,
        )
      : ["No networking activity yet."]),
    "",
    "Time Series",
    ...overview.timeseries.points.map(
      (point) => `${point.label}: ${point.checkIns} check-ins, ${point.meetings} meetings`,
    ),
  ];

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 612;
  const pageHeight = 792;
  const left = 54;
  const top = 744;
  const lineHeight = 16;
  const maxLinesPerPage = 42;

  const pages = chunk(lines, maxLinesPerPage);
  pages.forEach((pageLines, pageIndex) => {
    const page = pdf.addPage([pageWidth, pageHeight]);
    let y = top;

    pageLines.forEach((line, lineIndex) => {
      const isTitle = pageIndex === 0 && lineIndex === 0;
      page.drawText(sanitizePdfText(line), {
        x: left,
        y,
        size: isTitle ? 16 : 11,
        font: isTitle ? bold : font,
      });
      y -= isTitle ? 24 : lineHeight;
    });
  });

  return Buffer.from(await pdf.save());
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, "\"\"")}"`;
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function sanitizePdfText(value: string) {
  return value.replace(/\t/g, " ").replace(/\r?\n/g, " ");
}

function chunk<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}
