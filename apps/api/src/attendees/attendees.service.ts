import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SessionService } from "../session/session.service";
import { promises as fs } from "fs";
import path from "path";
import { AVATARS_UPLOAD_DIR } from "./avatar-upload.config";
import { MatchingService } from "../matching/matching.service";
import type { MatchProfile } from "../matching/matching.types";
import { hashToken } from "../common/tokens";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { GOALS_TAGS, LOOKING_FOR_TAGS, OFFERING_TAGS } from "./profile-options";

export type ResolveOnboardingResult =
  | {
      kind: "ok";
      sessionToken: string;
      attendee: {
        id: string;
        name: string;
        email: string;
        phone: string;
        businessName: string | null;
        chapterName: string | null;
        photoUrl: string | null;
        city: string | null;
        businessCategory: string | null;
        profileCompletedAt: Date | null;
      };
    }
  | { kind: "expired" };

export type DirectoryAttendee = {
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
  bookmarked: boolean;
  met: boolean;
};

export type PublicProfileData = {
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
};

@Injectable()
export class AttendeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly session: SessionService,
    private readonly matching: MatchingService,
  ) {}

  async resolveOnboardingToken(rawToken: string): Promise<ResolveOnboardingResult> {
    const record = await this.prisma.onboardingToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: { attendee: { include: { chapter: true } } },
    });

    if (!record || record.expiresAt < new Date()) {
      return { kind: "expired" };
    }

    const sessionToken = await this.session.issueSessionToken(record.attendee.id);

    return {
      kind: "ok",
      sessionToken,
      attendee: {
        id: record.attendee.id,
        name: record.attendee.name,
        email: record.attendee.email,
        phone: record.attendee.phone,
        businessName: record.attendee.businessName,
        chapterName: record.attendee.chapter?.name ?? null,
        photoUrl: record.attendee.photoUrl,
        city: record.attendee.city,
        businessCategory: record.attendee.businessCategory,
        profileCompletedAt: record.attendee.profileCompletedAt,
      },
    };
  }

  async getById(attendeeId: string) {
    const attendee = await this.prisma.attendee.findUnique({
      where: { id: attendeeId },
      include: { chapter: true },
    });
    if (!attendee) throw new NotFoundException("Attendee not found");
    return attendee;
  }

  /**
   * Public business card for a shareable profile link. Keyed on the attendee's
   * random UUID (unguessable capability URL) rather than qrToken, so a shared
   * link can't be used to auto-record a meeting. No auth — the card is meant to
   * be shared outside the app.
   */
  async getPublicProfile(id: string): Promise<PublicProfileData> {
    const attendee = await this.prisma.attendee.findUnique({
      where: { id },
      include: { chapter: true },
    });
    if (!attendee || !attendee.profileCompletedAt) {
      throw new NotFoundException("Profile not found");
    }
    return {
      id: attendee.id,
      name: attendee.name,
      businessName: attendee.businessName,
      chapterName: attendee.chapter?.name ?? null,
      city: attendee.city,
      businessCategory: attendee.businessCategory,
      bio: attendee.bio,
      phone: attendee.phone,
      photoUrl: attendee.photoUrl,
      linkedInUrl: attendee.linkedInUrl,
    };
  }

  async getDirectoryForAttendee(attendeeId: string): Promise<DirectoryAttendee[]> {
    const [attendees, bookmarks, meetings] = await Promise.all([
      this.prisma.attendee.findMany({
        where: {
          NOT: { id: attendeeId },
          profileCompletedAt: { not: null },
        },
        include: { chapter: true },
        orderBy: { name: "asc" },
      }),
      this.prisma.bookmark.findMany({
        where: { attendeeId },
        select: { targetId: true },
      }),
      this.prisma.meeting.findMany({
        where: { OR: [{ attendeeAId: attendeeId }, { attendeeBId: attendeeId }] },
        select: { attendeeAId: true, attendeeBId: true },
      }),
    ]);

    const bookmarkedIds = new Set(bookmarks.map((bookmark) => bookmark.targetId));
    const metIds = new Set(
      meetings.map((meeting) => (meeting.attendeeAId === attendeeId ? meeting.attendeeBId : meeting.attendeeAId)),
    );

    return attendees.map((attendee) => ({
      id: attendee.id,
      name: attendee.name,
      businessName: attendee.businessName,
      chapterName: attendee.chapter?.name ?? null,
      city: attendee.city,
      businessCategory: attendee.businessCategory,
      bio: attendee.bio,
      phone: attendee.phone,
      photoUrl: attendee.photoUrl,
      linkedInUrl: attendee.linkedInUrl,
      bookmarked: bookmarkedIds.has(attendee.id),
      met: metIds.has(attendee.id),
    }));
  }

  async updateProfile(attendeeId: string, dto: UpdateProfileDto) {
    const [category, cities] = await Promise.all([
      this.prisma.businessCategoryOption.findFirst({
        where: { name: dto.businessCategory, active: true },
        select: { id: true },
      }),
      this.prisma.cityOption.findMany({
        where: { active: true },
        select: { name: true, stateOrUt: true },
      }),
    ]);
    if (!category) throw new BadRequestException("Choose a valid business category");
    if (!cities.some((city) => this.cityValue(city) === dto.city)) {
      throw new BadRequestException("Choose a valid city");
    }

    return this.prisma.attendee.update({
      where: { id: attendeeId },
      data: {
        businessCategory: dto.businessCategory,
        city: dto.city,
        lookingFor: dto.lookingFor,
        offering: dto.offering,
        goals: dto.goals,
        bio: dto.bio,
        linkedInUrl: dto.linkedInUrl,
        profileCompletedAt: new Date(),
      },
    });
  }

  async updatePhoto(attendeeId: string, photoUrl: string | null) {
  const attendee = await this.prisma.attendee.findUnique({
    where: { id: attendeeId },
    select: { photoUrl: true },
  });

  if (attendee?.photoUrl && attendee.photoUrl !== photoUrl) {
    try {
      await fs.unlink(
        path.join(
          AVATARS_UPLOAD_DIR,
          path.basename(attendee.photoUrl),
        ),
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  return this.prisma.attendee.update({
    where: { id: attendeeId },
    data: { photoUrl },
    select: {
      id: true,
      photoUrl: true,
    },
  });
}

  private cityValue(city: { name: string; stateOrUt: string }) {
    return city.stateOrUt === "Legacy / Imported" ? city.name : `${city.name}, ${city.stateOrUt}`;
  }

  async getProfileOptions() {
    const [businessCategories, cities, chapters] = await Promise.all([
      this.prisma.businessCategoryOption.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { name: true },
      }),
      this.prisma.cityOption.findMany({
        where: { active: true },
        orderBy: [{ stateOrUt: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
        select: { name: true, stateOrUt: true },
      }),
      this.prisma.chapter.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { name: true },
      }),
    ]);

    return {
      businessCategories: businessCategories.map((option) => option.name),
      cities: cities.map((city) => ({ ...city, value: this.cityValue(city) })),
      chapters: chapters.map((chapter) => chapter.name),
      lookingFor: LOOKING_FOR_TAGS,
      offering: OFFERING_TAGS,
      goals: GOALS_TAGS,
    };
  }

  async listDirectory(currentAttendeeId: string) {
    const [attendees, businessCategories, cities, chapters, bookmarks, meetings] = await this.prisma.$transaction([
      this.prisma.attendee.findMany({
        where: { id: { not: currentAttendeeId } },
        select: {
          id: true,
          name: true,
          phone: true,
          businessName: true,
          businessCategory: true,
          city: true,
          photoUrl: true,
          tableNumber: true,
          linkedInUrl: true,
          chapter: { select: { name: true } },
          checkIn: { select: { createdAt: true } },
        },
        orderBy: { name: "asc" },
      }),
      this.prisma.businessCategoryOption.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { name: true },
      }),
      this.prisma.cityOption.findMany({
        where: { active: true },
        orderBy: [{ stateOrUt: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
        select: { name: true, stateOrUt: true },
      }),
      this.prisma.chapter.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { name: true },
      }),
      this.prisma.bookmark.findMany({ where: { attendeeId: currentAttendeeId }, select: { targetId: true } }),
      this.prisma.meeting.findMany({
        where: { OR: [{ attendeeAId: currentAttendeeId }, { attendeeBId: currentAttendeeId }] },
        select: { attendeeAId: true, attendeeBId: true },
      }),
    ]);

    const bookmarkedIds = new Set(bookmarks.map((bookmark) => bookmark.targetId));
    const metIds = new Set(
      meetings.map((meeting) => (meeting.attendeeAId === currentAttendeeId ? meeting.attendeeBId : meeting.attendeeAId)),
    );

    const directory = attendees.map((attendee) => ({
      id: attendee.id,
      name: attendee.name,
      phone: attendee.phone,
      businessName: attendee.businessName,
      businessCategory: attendee.businessCategory,
      city: attendee.city,
      photoUrl: attendee.photoUrl,
      tableNumber: attendee.tableNumber,
      linkedInUrl: attendee.linkedInUrl,
      chapterName: attendee.chapter?.name ?? null,
      checkedIn: Boolean(attendee.checkIn),
      bookmarked: bookmarkedIds.has(attendee.id),
      met: metIds.has(attendee.id),
    }));

    const unique = (values: Array<string | null>) =>
      [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b));

    return {
      attendees: directory,
      facets: {
        businessCategories: businessCategories.map((option) => option.name),
        companies: unique(directory.map((attendee) => attendee.businessName)),
        chapters: chapters.map((chapter) => chapter.name),
        cities: cities.map((city) => this.cityValue(city)),
        hasAttendeesWithoutChapter: directory.some((attendee) => !attendee.chapterName),
      },
    };
  }

  async getDirectoryProfile(viewerId: string, targetId: string) {
    const matchSelect = {
      businessCategory: true,
      lookingFor: true,
      offering: true,
      chapter: { select: { name: true } },
    } as const;

    const [attendee, viewer, bookmark] = await Promise.all([
      this.prisma.attendee.findUnique({
        where: { id: targetId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          businessName: true,
          city: true,
          photoUrl: true,
          tableNumber: true,
          goals: true,
          bio: true,
          checkIn: { select: { createdAt: true } },
          ...matchSelect,
        },
      }),
      viewerId === targetId
        ? Promise.resolve(null)
        : this.prisma.attendee.findUnique({ where: { id: viewerId }, select: { id: true, ...matchSelect } }),
      viewerId === targetId
        ? Promise.resolve(null)
        : this.prisma.bookmark.findUnique({ where: { attendeeId_targetId: { attendeeId: viewerId, targetId } } }),
    ]);
    if (!attendee) throw new NotFoundException("Attendee not found");

    // F2.5 personalised match reason, via the decoupled F2.1 engine. Absent when
    // viewing your own profile or when there is no meaningful match to explain.
    const match = viewer
      ? this.matching.computeMatch(toMatchProfile(viewer), toMatchProfile(attendee))
      : null;

    return {
      ...attendee,
      chapterName: attendee.chapter?.name ?? null,
      chapter: undefined,
      checkedIn: Boolean(attendee.checkIn),
      checkIn: undefined,
      match: match && match.headline ? match : null,
      bookmarked: Boolean(bookmark),
    };
  }

  // F3.5 (Print Badges) — qrToken is otherwise never exposed over the API.
  async listForBadges() {
    const attendees = await this.prisma.attendee.findMany({
      select: { id: true, name: true, businessName: true, qrToken: true, chapter: { select: { name: true } } },
      orderBy: { name: "asc" },
    });
    return attendees.map((a) => ({
      id: a.id,
      name: a.name,
      businessName: a.businessName,
      chapterName: a.chapter?.name ?? null,
      qrToken: a.qrToken,
    }));
  }
}

// Adapts a Prisma attendee row to the matching engine's schema-independent input.
function toMatchProfile(row: {
  id: string;
  businessCategory: string | null;
  lookingFor: string[];
  offering: string[];
  chapter: { name: string } | null;
}): MatchProfile {
  return {
    id: row.id,
    businessCategory: row.businessCategory,
    lookingFor: row.lookingFor,
    offering: row.offering,
    chapterName: row.chapter?.name ?? null,
  };
}
