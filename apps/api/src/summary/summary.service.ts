import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

type ExportConnection = { name: string; phone: string; email: string; businessName: string | null; businessCategory: string | null; chapterName: string | null; tableNumber: string | null; metAt: Date; note: string };

@Injectable()
export class SummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async get(attendeeId: string) {
    const [attendee, event, meetings, allMeetings, checkedIn] = await Promise.all([
      this.prisma.attendee.findUnique({ where: { id: attendeeId }, select: { id: true, name: true, deletedAt: true } }),
      this.prisma.event.findFirst({ orderBy: { createdAt: "desc" }, select: { name: true, startAt: true, endAt: true } }),
      this.connectionRows(attendeeId),
      this.prisma.meeting.findMany({ where: { attendeeA: { deletedAt: null }, attendeeB: { deletedAt: null } }, select: { attendeeAId: true, attendeeBId: true } }),
      this.prisma.attendee.findMany({ where: { checkIn: { isNot: null }, deletedAt: null }, select: { id: true, name: true } }),
    ]);
    if (!attendee || attendee.deletedAt) throw new NotFoundException("Attendee not found");

    const counts = new Map<string, number>();
    allMeetings.forEach((meeting) => { counts.set(meeting.attendeeAId, (counts.get(meeting.attendeeAId) ?? 0) + 1); counts.set(meeting.attendeeBId, (counts.get(meeting.attendeeBId) ?? 0) + 1); });
    const ranked = checkedIn.map((person) => ({ ...person, count: counts.get(person.id) ?? 0 })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    const ownCount = counts.get(attendeeId) ?? 0;
    const rankIndex = ranked.findIndex((person) => person.id === attendeeId);
    const rank = rankIndex < 0 ? ranked.length + 1 : 1 + ranked.slice(0, rankIndex).filter((person) => person.count > ownCount).length;
    const connections = this.mapConnections(attendeeId, meetings);

    return {
      attendeeName: attendee.name,
      event: { name: event?.name ?? "Evento", startAt: event?.startAt ?? null, endAt: event?.endAt ?? null },
      peopleMet: allMeetings.filter((meeting) => meeting.attendeeAId === attendeeId || meeting.attendeeBId === attendeeId).length,
      cardsCollected: connections.length,
      rank,
      totalRanked: checkedIn.length,
      topConnections: connections.slice(0, 5),
      generatedAt: new Date().toISOString(),
    };
  }

  async export(attendeeId: string, format: "csv" | "vcf") {
    const rows = this.mapConnections(attendeeId, await this.connectionRows(attendeeId));
    return format === "vcf" ? rows.map(toVCard).join("") : toCsv(rows);
  }

  private connectionRows(attendeeId: string) {
    return this.prisma.meeting.findMany({
      where: { OR: [{ attendeeAId: attendeeId, attendeeAHidden: false }, { attendeeBId: attendeeId, attendeeBHidden: false }] },
      orderBy: { createdAt: "desc" },
      include: {
        attendeeA: { select: { id: true, name: true, phone: true, email: true, businessName: true, businessCategory: true, tableNumber: true, chapter: { select: { name: true } } } },
        attendeeB: { select: { id: true, name: true, phone: true, email: true, businessName: true, businessCategory: true, tableNumber: true, chapter: { select: { name: true } } } },
      },
    });
  }

  private mapConnections(attendeeId: string, meetings: Awaited<ReturnType<SummaryService["connectionRows"]>>): ExportConnection[] {
    return meetings.map((meeting) => {
      const viewerIsA = meeting.attendeeAId === attendeeId;
      const { chapter, ...other } = viewerIsA ? meeting.attendeeB : meeting.attendeeA;
      return { ...other, chapterName: chapter?.name ?? null, metAt: meeting.createdAt, note: (viewerIsA ? meeting.attendeeANote : meeting.attendeeBNote) ?? "" };
    });
  }
}

function csv(value: unknown) { return `"${String(value ?? "").replace(/"/g, '""')}"`; }
function toCsv(rows: ExportConnection[]) { return ["Name,Company,Phone,Email,Table,Met At,Private Note", ...rows.map((row) => [row.name,row.businessName,row.phone,row.email,row.tableNumber,row.metAt.toISOString(),row.note].map(csv).join(","))].join("\r\n"); }
function esc(value: string) { return value.replace(/\\/g,"\\\\").replace(/\r?\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;"); }
function toVCard(row: ExportConnection) { return ["BEGIN:VCARD","VERSION:3.0",`FN:${esc(row.name)}`,`N:;${esc(row.name)};;;`,`TEL;TYPE=CELL:${esc(row.phone)}`,`EMAIL;TYPE=INTERNET:${esc(row.email)}`,row.businessName ? `ORG:${esc(row.businessName)}` : null,row.note ? `NOTE:${esc(row.note)}` : null,"END:VCARD"].filter(Boolean).join("\r\n") + "\r\n"; }
