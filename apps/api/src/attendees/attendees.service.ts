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
        profileCompletedAt: new Date(),
      },
    });
  }
}
