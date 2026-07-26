import { PrismaService } from "../prisma/prisma.service";
import { generateQrCode } from "./tokens";

/**
 * Collisions are vanishingly unlikely at ~2^50 of keyspace, so a handful of
 * attempts is plenty. The `Attendee.qrToken` unique constraint remains the real
 * guarantee — this pre-check just keeps callers from ever seeing a P2002.
 */
const MAX_ATTEMPTS = 5;

/** Allocate a short attendee QR code that no existing attendee is using. */
export async function generateUniqueQrCode(prisma: PrismaService): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const qrToken = generateQrCode();
    const clash = await prisma.attendee.findUnique({
      where: { qrToken },
      select: { id: true },
    });
    if (!clash) return qrToken;
  }
  throw new Error(`Could not allocate a unique QR code after ${MAX_ATTEMPTS} attempts`);
}
