import { randomBytes, createHash } from "crypto";

/** Opaque, non-sequential token — used for magic links and onboarding links. */
export function generateOpaqueToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Crockford base32 — digits plus uppercase letters, minus I/L/O/U. Every
 * character is in the QR spec's *alphanumeric* charset, which packs ~1.6x
 * denser than byte mode and keeps a 10-char code inside a version-1 (21x21) QR.
 */
const QR_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const QR_CODE_LENGTH = 10;

/**
 * Short, opaque attendee QR code (F4.1). 10 chars of base32 is ~2^50 of
 * keyspace — unguessable at event scale, while staying small enough that the
 * printed badge and on-screen QR scan near-instantly. Callers must handle a
 * P2002 on `Attendee.qrToken` by retrying, since uniqueness is not guaranteed
 * here (see `generateUniqueQrCode`).
 */
export function generateQrCode(): string {
  // 32 divides 256, so masking a random byte to 5 bits stays uniform.
  return Array.from(randomBytes(QR_CODE_LENGTH), (byte) => QR_CODE_ALPHABET[byte & 0x1f]).join("");
}

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
