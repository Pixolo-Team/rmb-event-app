import { Injectable, Logger } from "@nestjs/common";
import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
  verify,
} from "crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

export interface QRPayload {
  attendeeId: string;
  name: string;
  email: string;
  phone: string;
  businessName?: string;
}

@Injectable()
export class QRSigningService {
  private readonly logger = new Logger(QRSigningService.name);
  private readonly privateKey: string;
  private readonly publicKey: string;
  private readonly keyDir = join(process.cwd(), ".keys");

  constructor() {
    const keys = this.resolveKeys();
    this.privateKey = keys.privateKey;
    this.publicKey = keys.publicKey;
  }

  /**
   * Resolve the RSA key pair, in priority order:
   *   1. QR_PRIVATE_KEY env var — the production path. Stable across restarts
   *      and shared by every instance, so signed QR tokens keep verifying.
   *   2. Persisted .keys/*.pem files — dev convenience / persistent-volume hosts.
   *   3. A freshly generated ephemeral pair — last resort. Persisting it is
   *      best-effort so a read-only filesystem degrades instead of crashing boot.
   */
  private resolveKeys(): { privateKey: string; publicKey: string } {
    const envKey = process.env.QR_PRIVATE_KEY?.trim();
    if (envKey) {
      const privateKey = this.normalizePem(envKey);
      // Derive the public key from the private key so only one secret is needed.
      const publicKey = createPublicKey(privateKey)
        .export({ type: "spki", format: "pem" })
        .toString();
      this.logger.log("Loaded QR signing key from QR_PRIVATE_KEY env var");
      return { privateKey, publicKey };
    }

    const privateKeyPath = join(this.keyDir, "qr-private.pem");
    const publicKeyPath = join(this.keyDir, "qr-public.pem");
    if (existsSync(privateKeyPath) && existsSync(publicKeyPath)) {
      return {
        privateKey: readFileSync(privateKeyPath, "utf-8"),
        publicKey: readFileSync(publicKeyPath, "utf-8"),
      };
    }

    this.logger.warn(
      "No QR_PRIVATE_KEY env var or .keys/ files found — generating an ephemeral RSA key pair. " +
        "On an ephemeral or multi-instance host set QR_PRIVATE_KEY so signed QR tokens verify across restarts.",
    );
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    this.tryPersist(privateKey, publicKey);
    return { privateKey, publicKey };
  }

  /** Accept either raw PEM or base64-encoded PEM (friendlier for env vars). */
  private normalizePem(value: string): string {
    if (value.includes("BEGIN")) return value;
    return Buffer.from(value, "base64").toString("utf-8");
  }

  /** Best-effort key persistence; a read-only FS must not crash startup. */
  private tryPersist(privateKey: string, publicKey: string): void {
    try {
      if (!existsSync(this.keyDir)) {
        mkdirSync(this.keyDir, { recursive: true });
      }
      writeFileSync(join(this.keyDir, "qr-private.pem"), privateKey);
      writeFileSync(join(this.keyDir, "qr-public.pem"), publicKey);
      this.logger.log("RSA key pair saved to .keys directory");
    } catch (error) {
      this.logger.warn(
        `Could not persist QR keys to ${this.keyDir} (read-only filesystem?); ` +
          `using in-memory keys for this process only: ${error}`,
      );
    }
  }

  /** Sign a QR payload and return the signed token (base64url encoded) */
  sign(payload: QRPayload): string {
    const privateKeyObj = createPrivateKey(this.privateKey);
    const payloadJson = JSON.stringify(payload);

    const signature = sign("sha256", Buffer.from(payloadJson), privateKeyObj);
    const token = `${Buffer.from(payloadJson).toString("base64url")}.${signature.toString("base64url")}`;

    return token;
  }

  /** Verify a signed QR token and return the payload */
  verify(token: string): QRPayload | null {
    try {
      const [payloadB64, signatureB64] = token.split(".");
      if (!payloadB64 || !signatureB64) {
        this.logger.warn("Invalid token format");
        return null;
      }

      const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf-8");
      const payload: QRPayload = JSON.parse(payloadJson);

      const publicKeyObj = createPublicKey(this.publicKey);
      const signature = Buffer.from(signatureB64, "base64url");
      const isValid = verify("sha256", Buffer.from(payloadJson), publicKeyObj, signature);

      if (!isValid) {
        this.logger.warn("QR token signature verification failed");
        return null;
      }

      return payload;
    } catch (error) {
      this.logger.error(`QR token verification error: ${error}`);
      return null;
    }
  }

  /** Get the public key for client-side verification (if needed in future) */
  getPublicKey(): string {
    return this.publicKey;
  }
}
