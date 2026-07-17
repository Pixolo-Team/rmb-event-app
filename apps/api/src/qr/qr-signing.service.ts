import { Injectable, Logger } from "@nestjs/common";
import { createPrivateKey, createPublicKey, sign, verify } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
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
    this.privateKey = this.loadOrGeneratePrivateKey();
    this.publicKey = this.loadOrGeneratePublicKey();
  }

  private loadOrGeneratePrivateKey(): string {
    const privateKeyPath = join(this.keyDir, "qr-private.pem");
    if (existsSync(privateKeyPath)) {
      return readFileSync(privateKeyPath, "utf-8");
    }
    this.logger.log("Generating new RSA key pair for QR signing");
    return this.generateAndSaveKeyPair().privateKey;
  }

  private loadOrGeneratePublicKey(): string {
    const publicKeyPath = join(this.keyDir, "qr-public.pem");
    if (existsSync(publicKeyPath)) {
      return readFileSync(publicKeyPath, "utf-8");
    }
    return this.generateAndSaveKeyPair().publicKey;
  }

  private generateAndSaveKeyPair(): { privateKey: string; publicKey: string } {
    if (!existsSync(this.keyDir)) {
      const fs = require("fs");
      fs.mkdirSync(this.keyDir, { recursive: true });
    }

    const { generateKeyPairSync } = require("crypto");
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    writeFileSync(join(this.keyDir, "qr-private.pem"), privateKey);
    writeFileSync(join(this.keyDir, "qr-public.pem"), publicKey);
    this.logger.log("RSA key pair saved to .keys directory");

    return { privateKey, publicKey };
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
