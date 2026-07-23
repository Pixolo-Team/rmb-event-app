import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MatchingService } from "./matching.service";
import { UploadsService } from "../uploads/uploads.service";
import type { MatchProfile } from "./matching.types";

const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class MatchCacheService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matching: MatchingService,
    private readonly uploads: UploadsService,
  ) {}

  async recomputeFor(viewerId: string) {
    const rows = await this.prisma.attendee.findMany({
      where: { profileCompletedAt: { not: null }, deletedAt: null },
      include: { chapter: { select: { name: true } } },
    });
    const viewer = rows.find((row) => row.id === viewerId);
    if (!viewer) throw new NotFoundException("Attendee profile not found");

    const ranked = this.matching.rankMatches(toProfile(viewer), rows.filter((row) => row.id !== viewerId).map(toProfile)).slice(0, 10);
    const computedAt = new Date();
    await this.prisma.$transaction([
      this.prisma.matchCache.deleteMany({ where: { viewerId } }),
      this.prisma.matchCache.createMany({ data: ranked.map(({ candidate, match }) => ({
        viewerId,
        candidateId: candidate.id,
        score: match.score,
        reasons: match.reasons,
        headline: match.headline ?? "Recommended attendee",
        chapterRelation: match.chapterRelation,
        computedAt,
      })) }),
    ]);
    return { computedAt, count: ranked.length };
  }

  async listFor(viewerId: string, force = false) {
    const newest = await this.prisma.matchCache.findFirst({ where: { viewerId }, orderBy: { computedAt: "desc" }, select: { computedAt: true } });
    if (force || !newest || Date.now() - newest.computedAt.getTime() > CACHE_MAX_AGE_MS) await this.recomputeFor(viewerId);

    const [viewer, matches, totalAttendees, meetings] = await Promise.all([
      this.prisma.attendee.findUnique({ where: { id: viewerId }, select: { profileCompletedAt: true, deletedAt: true } }),
      this.prisma.matchCache.findMany({
        where: { viewerId, candidate: { deletedAt: null } }, orderBy: [{ score: "desc" }, { candidate: { name: "asc" } }], take: 10,
        include: { candidate: { include: { chapter: { select: { name: true } }, checkIn: { select: { createdAt: true } }, bookmarksOnMe: { where: { attendeeId: viewerId }, select: { targetId: true } } } } },
      }),
      this.prisma.attendee.count({ where: { id: { not: viewerId }, profileCompletedAt: { not: null }, deletedAt: null } }),
      this.prisma.meeting.findMany({
        where: { OR: [{ attendeeAId: viewerId }, { attendeeBId: viewerId }] },
        select: { attendeeAId: true, attendeeBId: true },
      }),
    ]);
    if (!viewer || viewer.deletedAt) throw new NotFoundException("Attendee not found");
    const metIds = new Set(
      meetings.map((meeting) => (meeting.attendeeAId === viewerId ? meeting.attendeeBId : meeting.attendeeAId)),
    );

    return {
      profileComplete: Boolean(viewer.profileCompletedAt), totalAttendees,
      computedAt: matches[0]?.computedAt ?? null,
      matches: await Promise.all(matches.map(async ({ candidate, ...match }) => ({
        id: candidate.id, name: candidate.name, businessName: candidate.businessName,
        businessCategory: candidate.businessCategory, city: candidate.city,
        chapterName: candidate.chapter?.name ?? null, tableNumber: candidate.tableNumber,
        photoUrl: candidate.photoUrl ? await this.uploads.resolveProfilePhotoUrl(candidate.photoUrl) : null,
        checkedIn: Boolean(candidate.checkIn),
        phone: candidate.phone, linkedInUrl: candidate.linkedInUrl,
        websiteUrl: candidate.websiteUrl,
        bookmarked: candidate.bookmarksOnMe.length > 0,
        met: metIds.has(candidate.id),
        score: match.score, reasons: match.reasons, headline: match.headline,
        chapterRelation: match.chapterRelation, computedAt: match.computedAt,
      }))),
    };
  }
}

function toProfile(row: { id: string; businessCategory: string | null; lookingFor: string[]; offering: string[]; chapter: { name: string } | null }): MatchProfile {
  return { id: row.id, businessCategory: row.businessCategory, lookingFor: row.lookingFor, offering: row.offering, chapterName: row.chapter?.name ?? null };
}
