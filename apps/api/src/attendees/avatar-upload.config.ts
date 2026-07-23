// DEPRECATED: This file is legacy code from when avatars were stored on local disk.
// Avatar uploads now use Google Cloud Storage via UploadsService.
// This file is imported in event.controller.ts but not actually used.
// Safe to delete once the import is removed.

import { BadRequestException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { diskStorage } from "multer";
import path from "path";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const AVATARS_UPLOAD_DIR = path.join(process.cwd(), "uploads", "avatars");

export const avatarUploadOptions = {
  storage: diskStorage({
    destination: (
      _req: unknown,
      _file: Express.Multer.File,
      cb: (error: Error | null, destination: string) => void,
    ) => {
      try {
        const { mkdirSync } = require("fs");
        mkdirSync(AVATARS_UPLOAD_DIR, { recursive: true });
        cb(null, AVATARS_UPLOAD_DIR);
      } catch (err) {
        cb(err instanceof Error ? err : new Error(String(err)), AVATARS_UPLOAD_DIR);
      }
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    cb: (error: Error | null, accept: boolean) => void,
  ) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(new BadRequestException("Only JPEG, PNG, WEBP, or HEIC images are allowed"), false);
      return;
    }
    cb(null, true);
  },
};
