import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SessionService } from "../session/session.service";
import { hashToken } from "../common/tokens";
import { UpdateProfileDto } from "./dto/update-profile.dto";

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

  async updatePhoto(attendeeId: string, photoUrl: string) {
    return this.prisma.attendee.update({
      where: { id: attendeeId },
      data: { photoUrl },
    });
  }
}
