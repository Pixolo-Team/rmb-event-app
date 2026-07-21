import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SessionService } from "../session/session.service";
import { promises as fs } from "fs";
import path from "path";
import { AVATARS_UPLOAD_DIR } from "./avatar-upload.config";
import { MatchingService } from "../matching/matching.service";
import type { MatchProfile } from "../matching/matching.types";
import { hashToken } from "../common/tokens";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UpdateLinksDto } from "./dto/update-links.dto";
import { GOALS_TAGS, OFFERING_TAGS } from "./profile-options";
import { CreateAdminAttendeeDto } from "./dto/create-admin-attendee.dto";

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
        websiteUrl: string | null;
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
  websiteUrl: string | null;
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
  websiteUrl: string | null;
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

    if (!record || record.expiresAt < new Date() || record.attendee.deletedAt) {
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
        websiteUrl: record.attendee.websiteUrl,
      },
    };
  }

  async getById(attendeeId: string) {
    const attendee = await this.prisma.attendee.findUnique({
      where: { id: attendeeId },
      include: { chapter: true },
    });
    if (!attendee || attendee.deletedAt) throw new NotFoundException("Attendee not found");
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
    if (!attendee || attendee.deletedAt || !attendee.profileCompletedAt) {
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
      websiteUrl: attendee.websiteUrl,
    };
  }

  async getDirectoryForAttendee(attendeeId: string): Promise<DirectoryAttendee[]> {
    const [attendees, bookmarks, meetings] = await Promise.all([
      this.prisma.attendee.findMany({
        where: {
          NOT: { id: attendeeId },
          profileCompletedAt: { not: null },
          deletedAt: null,
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
      websiteUrl: attendee.websiteUrl,
      bookmarked: bookmarkedIds.has(attendee.id),
      met: metIds.has(attendee.id),
    }));
  }

  // Partial update of just the optional profile links (the /profile website editor).
  // No required-field validation and no profileCompletedAt touch — see UpdateLinksDto.
  async updateLinks(attendeeId: string, dto: UpdateLinksDto) {
    return this.prisma.attendee.update({
      where: { id: attendeeId },
      data: {
        ...(dto.linkedInUrl !== undefined && { linkedInUrl: dto.linkedInUrl ?? null }),
        ...(dto.websiteUrl !== undefined && { websiteUrl: dto.websiteUrl ?? null }),
      },
      select: { linkedInUrl: true, websiteUrl: true },
    });
  }

  async updateProfile(attendeeId: string, dto: UpdateProfileDto) {
    const current = await this.prisma.attendee.findUnique({
      where: { id: attendeeId },
      select: {
        businessCategory: true,
        city: true,
        lookingFor: true,
        offering: true,
        goals: true,
        bio: true,
        linkedInUrl: true,
        websiteUrl: true,
      },
    });
    if (!current) throw new NotFoundException("Attendee not found");

    const next = {
      businessCategory: dto.businessCategory ?? current.businessCategory,
      city: dto.city ?? current.city,
      lookingFor: dto.lookingFor ?? current.lookingFor,
      offering: dto.offering ?? current.offering,
      goals: dto.goals ?? current.goals,
      bio: dto.bio ?? current.bio,
      linkedInUrl: dto.linkedInUrl === undefined ? current.linkedInUrl : dto.linkedInUrl,
      websiteUrl: dto.websiteUrl === undefined ? current.websiteUrl : dto.websiteUrl,
    };
    if (!next.businessCategory) throw new BadRequestException("Choose your business category");
    if (!next.city) throw new BadRequestException("Choose a valid city");

    const [category, validOfferingOptions, validLookingForOptions, cities] = await Promise.all([
      this.prisma.businessCategoryOption.findFirst({
        where: { name: next.businessCategory, active: true },
        select: { id: true },
      }),
      this.prisma.offeringOption.findMany({
        where: { active: true, category: { name: next.businessCategory, active: true } },
        select: { name: true },
      }),
      this.prisma.offeringOption.findMany({
        where: { active: true, category: { active: true } },
        select: { name: true },
      }),
      this.prisma.cityOption.findMany({
        where: { active: true },
        select: { name: true, stateOrUt: true },
      }),
    ]);
    if (!category) throw new BadRequestException("Choose a valid business category");
    const validOfferings = new Set(validOfferingOptions.map((option) => option.name));
    if (next.offering.some((offering) => !validOfferings.has(offering))) {
      throw new BadRequestException("Choose valid offerings for your business category");
    }
    const validLookingFor = new Set(validLookingForOptions.map((option) => option.name));
    if (next.lookingFor.some((lookingFor) => !validLookingFor.has(lookingFor))) {
      throw new BadRequestException("Choose valid looking-for options");
    }
    if (!cities.some((city) => this.cityValue(city) === next.city)) {
      throw new BadRequestException("Choose a valid city");
    }

    return this.prisma.attendee.update({
      where: { id: attendeeId },
      data: {
        businessCategory: next.businessCategory,
        city: next.city,
        lookingFor: next.lookingFor,
        offering: next.offering,
        goals: next.goals,
        bio: next.bio,
        linkedInUrl: next.linkedInUrl,
        websiteUrl: next.websiteUrl,
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
    const [businessCategories, offeringOptions, cities, chapters] = await Promise.all([
      this.prisma.businessCategoryOption.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { name: true },
      }),
      this.prisma.offeringOption.findMany({
        where: { active: true, category: { active: true } },
        orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
        select: { name: true, category: { select: { name: true } } },
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

    const offeringsByCategory = offeringOptions.reduce<Record<string, string[]>>((grouped, option) => {
      (grouped[option.category.name] ??= []).push(option.name);
      return grouped;
    }, {});
    const allOfferings = [...new Set(offeringOptions.map((option) => option.name))];

    return {
      businessCategories: businessCategories.map((option) => option.name),
      offeringsByCategory,
      cities: cities.map((city) => ({ ...city, value: this.cityValue(city) })),
      chapters: chapters.map((chapter) => chapter.name),
      lookingFor: allOfferings,
      offering: OFFERING_TAGS,
      goals: GOALS_TAGS,
    };
  }

  async listDirectory(currentAttendeeId: string) {
    const [attendees, businessCategories, cities, chapters, bookmarks, meetings] = await this.prisma.$transaction([
      this.prisma.attendee.findMany({
        where: { id: { not: currentAttendeeId }, deletedAt: null },
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
          websiteUrl: true,
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
      websiteUrl: attendee.websiteUrl,
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
          linkedInUrl: true,
          websiteUrl: true,
          checkIn: { select: { createdAt: true } },
          deletedAt: true,
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
    if (!attendee || attendee.deletedAt) throw new NotFoundException("Attendee not found");

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
      deletedAt: undefined,
      match: match && match.headline ? match : null,
      bookmarked: Boolean(bookmark),
    };
  }

  // F3.5 (Print Badges) — qrToken is otherwise never exposed over the API.
  async listForBadges() {
    const attendees = await this.prisma.attendee.findMany({
      where: { deletedAt: null },
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

  async listForAdminManagement() {
    const attendees = await this.prisma.attendee.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        businessName: true,
        businessCategory: true,
        city: true,
        tableNumber: true,
        profileCompletedAt: true,
        deletedAt: true,
        checkIn: { select: { createdAt: true, method: true } },
        chapter: { select: { name: true } },
      },
      orderBy: [{ deletedAt: "asc" }, { name: "asc" }],
    });

    return attendees.map((attendee) => ({
      id: attendee.id,
      name: attendee.name,
      email: attendee.email,
      phone: attendee.phone,
      businessName: attendee.businessName,
      businessCategory: attendee.businessCategory,
      city: attendee.city,
      tableNumber: attendee.tableNumber,
      chapterName: attendee.chapter?.name ?? null,
      profileCompletedAt: attendee.profileCompletedAt,
      deletedAt: attendee.deletedAt,
      checkedInAt: attendee.checkIn?.createdAt ?? null,
      checkInMethod: attendee.checkIn?.method ?? null,
    }));
  }

  async createForAdmin(dto: CreateAdminAttendeeDto) {
    const name = dto.name.trim();
    const email = dto.email.trim().toLowerCase();
    const phone = dto.phone.trim();
    if (!name || !email || !phone) throw new BadRequestException("Name, email and phone are required");

    try {
      return await this.prisma.attendee.create({
        data: {
          id: randomUUID(),
          name,
          email,
          phone,
          qrToken: randomUUID(),
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          qrToken: true,
          createdAt: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("An attendee with this email or phone already exists");
      }
      throw error;
    }
  }

  async softDeleteForAdmin(attendeeId: string) {
    const attendee = await this.prisma.attendee.findUnique({
      where: { id: attendeeId },
      select: { id: true, deletedAt: true },
    });
    if (!attendee) throw new NotFoundException("Attendee not found");
    if (attendee.deletedAt) return { status: "already_deleted", deletedAt: attendee.deletedAt };

    const deleted = await this.prisma.attendee.update({
      where: { id: attendeeId },
      data: { deletedAt: new Date() },
      select: { deletedAt: true },
    });
    return { status: "deleted", deletedAt: deleted.deletedAt };
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
