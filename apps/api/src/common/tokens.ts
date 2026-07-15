import { randomBytes, createHash } from "crypto";

/** Opaque, non-sequential token — used for QR codes, magic links, and onboarding links. */
export function generateOpaqueToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
