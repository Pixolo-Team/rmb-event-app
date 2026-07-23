import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { CheckInMethod } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { EventService } from "../event/event.service";
import { QRSigningService } from "../qr/qr-signing.service";
import { WhatsAppService } from "../whatsapp/whatsapp.service";
import { distanceMeters } from "../common/geo";

export type CheckinOutcome =
  | { status: "checked_in"; method: CheckInMethod; checkedInAt: Date }
  | { status: "already_checked_in"; method: CheckInMethod; checkedInAt: Date }
  | { status: "outside_radius"; distanceM: number }
  | { status: "venue_not_configured" }
  | { status: "invalid_venue_token" };

@Injectable()
export class CheckinService {
  private readonly logger = new Logger(CheckinService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventService: EventService,
    private readonly qrSigning: QRSigningService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  async getMyStatus(attendeeId: string) {
    const checkIn = await this.prisma.checkIn.findUnique({ where: { attendeeId } });
    return checkIn
      ? { checkedIn: true, checkedInAt: checkIn.createdAt, method: checkIn.method }
      : { checkedIn: false, checkedInAt: null, method: null };
  }

  async checkInByGeolocation(attendeeId: string, lat: number, lng: number): Promise<CheckinOutcome> {
    const event = await this.eventService.getOrCreate();
    if (event.venueLat === null || event.venueLng === null) {
      return { status: "venue_not_configured" };
    }

    const distanceM = distanceMeters(lat, lng, event.venueLat, event.venueLng);
    if (distanceM > event.checkinRadiusM) {
      return { status: "outside_radius", distanceM: Math.round(distanceM) };
    }

    return this.recordCheckIn(attendeeId, "GEOLOCATION");
  }

  async checkInManual(attendeeId: string): Promise<CheckinOutcome> {
    return this.recordCheckIn(attendeeId, "MANUAL");
  }

  async checkInByAdminManual(attendeeId: string): Promise<CheckinOutcome & { attendeeName: string }> {
    const attendee = await this.prisma.attendee.findUnique({
      where: { id: attendeeId },
      select: { id: true, name: true, phone: true, deletedAt: true },
    });
    if (!attendee || attendee.deletedAt) throw new NotFoundException("Attendee not found");

    const outcome = await this.recordCheckIn(attendee.id, "MANUAL");
    return { ...outcome, attendeeName: attendee.name };
  }

  // Fire-and-forget: a slow or failing WhatsApp API call shouldn't block or
  // fail the check-in itself.
  private notifyCheckin(attendeeId: string, phone: string, name: string): void {
    this.whatsapp.sendCheckinConfirmation(phone, name).catch((err) => {
      this.logger.error(
        `WhatsApp check-in confirmation failed for attendee ${attendeeId}: ${(err as Error).message}`,
      );
    });
  }

  async markAbsentByAdmin(attendeeId: string) {
    const result = await this.prisma.checkIn.deleteMany({ where: { attendeeId } });
    return { status: result.count > 0 ? "marked_absent" : "already_absent" } as const;
  }

  // F3.7 — attendee scanned the venue attendance QR. The token is the event's
  // current venueCheckinToken; a stale/forged one is rejected so a random string
  // can't self-check-in.
  async checkInByVenueQr(attendeeId: string, token: string): Promise<CheckinOutcome> {
    const event = await this.eventService.getOrCreate();
    if (!event.venueCheckinToken || event.venueCheckinToken !== token) {
      return { status: "invalid_venue_token" };
    }
    return this.recordCheckIn(attendeeId, "VENUE_QR");
  }

  async checkInByStaffQrScan(
    qrToken: string,
  ): Promise<(CheckinOutcome & { attendeeName: string }) | { status: "not_found" }> {
    // First, try to verify as a signed JWT token (PF5)
    const payload = this.qrSigning.verify(qrToken);
    let attendee;

    if (payload) {
      // Valid signed JWT — use the attendeeId from payload
      attendee = await this.prisma.attendee.findUnique({ where: { id: payload.attendeeId } });
    } else {
      // Fall back to DB lookup for legacy tokens (backward compatibility)
      attendee = await this.prisma.attendee.findUnique({ where: { qrToken } });
    }

    if (!attendee || attendee.deletedAt) {
      return { status: "not_found" };
    }
    const outcome = await this.recordCheckIn(attendee.id, "STAFF_QR");
    return { ...outcome, attendeeName: attendee.name };
  }

  private async recordCheckIn(attendeeId: string, method: CheckInMethod): Promise<CheckinOutcome> {
    const existing = await this.prisma.checkIn.findUnique({ where: { attendeeId } });
    if (existing) {
      return { status: "already_checked_in", method: existing.method, checkedInAt: existing.createdAt };
    }

    try {
      const checkIn = await this.prisma.checkIn.create({ data: { attendeeId, method } });
      const attendee = await this.prisma.attendee.findUnique({
        where: { id: attendeeId },
        select: { name: true, phone: true },
      });
      if (attendee) this.notifyCheckin(attendeeId, attendee.phone, attendee.name);
      return { status: "checked_in", method: checkIn.method, checkedInAt: checkIn.createdAt };
    } catch {
      // Unique-constraint race: another request (e.g. a concurrent staff scan)
      // recorded the check-in a moment earlier — treat it the same as "already checked in".
      const raceWinner = await this.prisma.checkIn.findUnique({ where: { attendeeId } });
      if (raceWinner) {
        return { status: "already_checked_in", method: raceWinner.method, checkedInAt: raceWinner.createdAt };
      }
      throw new Error("Failed to record check-in");
    }
  }

  async getAdminStatus() {
    const [totalAttendees, checkIns] = await Promise.all([
      this.prisma.attendee.count({ where: { deletedAt: null } }),
      this.prisma.checkIn.findMany({
        where: { attendee: { deletedAt: null } },
        include: { attendee: { select: { id: true, name: true, businessName: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const breakdown: Record<CheckInMethod, number> = { GEOLOCATION: 0, MANUAL: 0, STAFF_QR: 0, VENUE_QR: 0 };
    for (const c of checkIns) breakdown[c.method]++;

    const checkedInIds = checkIns.map((c) => c.attendeeId);
    const notCheckedIn = await this.prisma.attendee.findMany({
      where: { id: { notIn: checkedInIds }, deletedAt: null },
      select: { id: true, name: true, phone: true, businessName: true },
      orderBy: { name: "asc" },
    });

    return {
      totalAttendees,
      checkedInCount: checkIns.length,
      breakdown,
      checkedIn: checkIns.map((c) => ({
        attendeeId: c.attendeeId,
        name: c.attendee.name,
        businessName: c.attendee.businessName,
        method: c.method,
        checkedInAt: c.createdAt,
      })),
      notCheckedIn: notCheckedIn.map((a) => ({
        attendeeId: a.id,
        name: a.name,
        phone: a.phone,
        businessName: a.businessName,
      })),
    };
  }
}
