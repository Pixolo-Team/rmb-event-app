import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export type LeaderboardEntry = {
  id: string;
  rank: number;
  name: string;
  businessName: string | null;
  photoUrl: string | null;
  metCount: number;
};

type LeaderboardSnapshot = { entries: LeaderboardEntry[]; totalAttendees: number; updatedAt: string };

@Injectable()
export class LeaderboardService {
  private cached: { expiresAt: number; value: LeaderboardSnapshot } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async getForAttendee(attendeeId: string) {
    const snapshot = await this.snapshot();
    const ownEntry = snapshot.entries.find((entry) => entry.id === attendeeId) ?? await this.uncheckedInEntry(attendeeId, snapshot.entries);
    return { top: snapshot.entries.slice(0, 20), me: ownEntry, totalAttendees: snapshot.totalAttendees, updatedAt: snapshot.updatedAt };
  }

  async getVenueDisplay() {
    const snapshot = await this.snapshot();
    return { top: snapshot.entries.slice(0, 20), totalAttendees: snapshot.totalAttendees, updatedAt: snapshot.updatedAt };
  }

  private async snapshot(): Promise<LeaderboardSnapshot> {
    if (this.cached && this.cached.expiresAt > Date.now()) return this.cached.value;

    const [attendees, meetings] = await Promise.all([
      this.prisma.attendee.findMany({
        where: { checkIn: { isNot: null }, deletedAt: null },
        select: { id: true, name: true, businessName: true, photoUrl: true },
      }),
      this.prisma.meeting.findMany({ select: { attendeeAId: true, attendeeBId: true } }),
    ]);

    const counts = new Map<string, number>();
    for (const meeting of meetings) {
      counts.set(meeting.attendeeAId, (counts.get(meeting.attendeeAId) ?? 0) + 1);
      counts.set(meeting.attendeeBId, (counts.get(meeting.attendeeBId) ?? 0) + 1);
    }

    let previousCount: number | null = null;
    let currentRank = 0;
    const entries = attendees
      .map((attendee) => ({ ...attendee, metCount: counts.get(attendee.id) ?? 0 }))
      .sort((a, b) => b.metCount - a.metCount || a.name.localeCompare(b.name))
      .map((attendee, index) => {
        if (attendee.metCount !== previousCount) currentRank = index + 1;
        previousCount = attendee.metCount;
        return { ...attendee, rank: currentRank };
      });

    const value = { entries, totalAttendees: attendees.length, updatedAt: new Date().toISOString() };
    this.cached = { expiresAt: Date.now() + 5000, value };
    return value;
  }

  private async uncheckedInEntry(attendeeId: string, ranked: LeaderboardEntry[]): Promise<LeaderboardEntry | null> {
    const attendee = await this.prisma.attendee.findUnique({ where: { id: attendeeId }, select: { id: true, name: true, businessName: true, photoUrl: true, deletedAt: true } });
    if (attendee?.deletedAt) return null;
    if (!attendee) return null;
    return {
      id: attendee.id,
      name: attendee.name,
      businessName: attendee.businessName,
      photoUrl: attendee.photoUrl,
      metCount: 0,
      rank: ranked.length + 1,
    };
  }
}
