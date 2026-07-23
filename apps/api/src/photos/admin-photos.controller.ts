import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import type { Express } from "express";
import { AdminGuard } from "../admin-auth/admin.guard";
import { RolesGuard } from "../admin-auth/roles.guard";
import { PhotosService } from "./photos.service";
import { RateLimit } from "../common/rate-limit/rate-limit.decorator";
import { RateLimitGuard } from "../common/rate-limit/rate-limit.guard";
import { photoUploadOptions } from "./photo-upload.config";
import { CreatePhotoDto } from "./dto/create-photo.dto";

// Superadmin-only by RolesGuard's default (no @Roles() needed).
@Controller("admin/photos")
@UseGuards(AdminGuard, RolesGuard, RateLimitGuard)
export class AdminPhotosController {
  constructor(private readonly photos: PhotosService) {}

  @Get()
  listAll() {
    return this.photos.adminListAll();
  }

  @Get("deleted")
  listDeleted() {
    return this.photos.adminListDeletedHistory();
  }

  @Post()
  @RateLimit(20)
  @UseInterceptors(FilesInterceptor("photos", 6, photoUploadOptions))
  async create(
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @Body() dto: CreatePhotoDto,
  ) {
    if (!files?.length) throw new BadRequestException("No photos uploaded");
    return this.photos.adminCreate(files, dto.caption);
  }

  @Delete(":id")
  @RateLimit(60)
  async remove(@Param("id") id: string) {
    await this.photos.adminDelete(id);
    return { status: "ok" };
  }
}
