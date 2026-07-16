import { Injectable } from "@nestjs/common";
import { parse } from "csv-parse/sync";
import { PrismaService } from "../prisma/prisma.service";
import { WhatsAppService } from "../whatsapp/whatsapp.service";
import { generateOpaqueToken, hashToken } from "../common/tokens";
import { mapColumns, ColumnMappingError } from "./column-mapper";
import { ImportRowStatus } from "@prisma/client";

const ONBOARDING_TOKEN_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours, per PRD Security & Privacy

export interface ImportRowOutcome {
  rowNumber: number;
  status: ImportRowStatus;
  reason?: string;
  attendeeId?: string;
}

export interface ImportSummary {
  batchId: string;
  successCount: number;
  duplicateCount: number;
  errorCount: number;
  flaggedCount: number;
  rows: ImportRowOutcome[];
}

function cell(row: string[], idx: number | null): string {
  if (idx === null) return "";
  return (row[idx] ?? "").trim();
}

@Injectable()
export class AdminImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  async importCsv(fileBuffer: Buffer, fileName: string): Promise<ImportSummary> {
    const records: string[][] = parse(fileBuffer, { skip_empty_lines: true });
    if (records.length === 0) {
      throw new ColumnMappingError("File is empty");
    }

    const [headerRow, ...dataRows] = records;
    const mapping = mapColumns(headerRow);

    const outcomes: ImportRowOutcome[] = [];
    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();

    for (let i = 0; i < dataRows.length; i++) {
      const rowNumber = i + 2; // +1 for header row, +1 for 1-indexing
      const row = dataRows[i];
      const outcome = await this.importRow(row, rowNumber, mapping, seenEmails, seenPhones);
      outcomes.push(outcome);
    }

    const successCount = outcomes.filter((o) => o.status === "OK").length;
    const duplicateCount = outcomes.filter((o) => o.status === "DUPLICATE").length;
    const errorCount = outcomes.filter((o) => o.status === "ERROR").length;
    const flaggedCount = outcomes.filter((o) => o.status === "FLAGGED").length;

    const batch = await this.prisma.importBatch.create({
      data: {
        fileName,
        successCount,
        duplicateCount,
        errorCount,
        flaggedCount,
        rows: {
          create: outcomes.map((o, i) => ({
            rowNumber: o.rowNumber,
            rawData: dataRows[i] as unknown as object,
            status: o.status,
            reason: o.reason,
          })),
        },
      },
    });

    return { batchId: batch.id, successCount, duplicateCount, errorCount, flaggedCount, rows: outcomes };
  }

  private async importRow(
    row: string[],
    rowNumber: number,
    mapping: ReturnType<typeof mapColumns>,
    seenEmails: Set<string>,
    seenPhones: Set<string>,
  ): Promise<ImportRowOutcome> {
    const name = cell(row, mapping.nameIdx);
    const email = cell(row, mapping.emailIdx).toLowerCase();
    const altEmail = cell(row, mapping.altEmailIdx).toLowerCase();
    const phone = cell(row, mapping.phoneIdx);
    const businessName = cell(row, mapping.businessIdx);
    const chapterName = cell(row, mapping.chapterIdx);
    const city = cell(row, mapping.cityIdx);
    const businessCategory = cell(row, mapping.categoryIdx);

    const missing = [
      !name && "name",
      !email && "email",
      !phone && "phone",
      !businessName && "business/profession name",
    ].filter(Boolean);
    if (missing.length > 0) {
      return { rowNumber, status: "ERROR", reason: `Missing required field(s): ${missing.join(", ")}` };
    }

    if (seenEmails.has(email) || seenPhones.has(phone)) {
      return { rowNumber, status: "DUPLICATE", reason: "Duplicate within this file" };
    }
    const existing = await this.prisma.attendee.findFirst({
      where: { OR: [{ email }, { phone }] },
    });
    if (existing) {
      return { rowNumber, status: "DUPLICATE", reason: "Already imported (matches an existing attendee by email or phone)" };
    }

    seenEmails.add(email);
    seenPhones.add(phone);

    const emailsDisagree = altEmail && altEmail !== email;

    let chapterId: string | undefined;
    if (chapterName) {
      const chapter = await this.prisma.chapter.upsert({
        where: { name: chapterName },
        update: {},
        create: { name: chapterName },
      });
      chapterId = chapter.id;
    }

    const qrToken = generateOpaqueToken();
    const rawOnboardingToken = generateOpaqueToken();

    const attendee = await this.prisma.attendee.create({
      data: {
        name,
        email,
        phone,
        businessName,
        chapterId,
        city: city || undefined,
        businessCategory: businessCategory || undefined,
        qrToken,
        onboardingTokens: {
          create: {
            tokenHash: hashToken(rawOnboardingToken),
            expiresAt: new Date(Date.now() + ONBOARDING_TOKEN_TTL_MS),
          },
        },
      },
    });

    const appOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
    const onboardingLink = `${appOrigin}/onboarding?token=${rawOnboardingToken}`;
    await this.whatsapp.sendOnboardingInvite(phone, name, onboardingLink);

    if (emailsDisagree) {
      return {
        rowNumber,
        status: "FLAGGED",
        reason: `The form's two email columns disagree ("${altEmail}" vs "${email}") — imported using "${email}"`,
        attendeeId: attendee.id,
      };
    }

    return { rowNumber, status: "OK", attendeeId: attendee.id };
  }
}
