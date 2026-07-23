import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Express } from "express";
import { AdminGuard } from "../admin-auth/admin.guard";
import { RolesGuard } from "../admin-auth/roles.guard";
import { AdminImportService } from "./admin-import.service";
import { ColumnMappingError } from "./column-mapper";
import { RateLimit } from "../common/rate-limit/rate-limit.decorator";
import { RateLimitGuard } from "../common/rate-limit/rate-limit.guard";

// Superadmin-only by RolesGuard's default (no @Roles() needed).
@Controller("admin/import")
@UseGuards(AdminGuard, RolesGuard, RateLimitGuard)
export class AdminImportController {
  constructor(private readonly adminImport: AdminImportService) {}

  @Post()
  @RateLimit(10)
  @UseInterceptors(FileInterceptor("file"))
  async import(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    try {
      return await this.adminImport.importCsv(file.buffer, file.originalname);
    } catch (err) {
      if (err instanceof ColumnMappingError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }
}
