import { BadRequestException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { diskStorage } from "multer";
import path from "path";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const PHOTOS_UPLOAD_DIR = path.join(process.cwd(), "uploads", "photos");

export const photoUploadOptions = {
  storage: diskStorage({
    destination: PHOTOS_UPLOAD_DIR,
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
