import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../admin-auth/admin.guard";
import { PhotosService } from "./photos.service";
import { RateLimit } from "../common/rate-limit/rate-limit.decorator";
import { RateLimitGuard } from "../common/rate-limit/rate-limit.guard";
import { CreatePhotoDto } from "./dto/create-photo.dto";
import { UploadsService, ADMIN_UPLOAD_OWNER } from "../uploads/uploads.service";
import { CreateUploadUrlsRequestData } from "../uploads/dto/create-upload-urls.request";

@Controller("admin/photos")
@UseGuards(AdminGuard, RateLimitGuard)
export class AdminPhotosController {
  constructor(
    private readonly photos: PhotosService,
    private readonly uploads: UploadsService,
  ) {}

  @Get()
  listAll() {
    return this.photos.adminListAll();
  }

  @Get("deleted")
  listDeleted() {
    return this.photos.adminListDeletedHistory();
  }

  /**
   * Generates signed GCS upload URLs for an admin feed post. AdminGuard has
   * no attendeeId concept, so admin uploads are owned by a fixed marker
   * segment rather than a real attendee.
   */
  @Post("upload-urls")
  async createUploadUrls(@Body() dto: CreateUploadUrlsRequestData) {
    const result = await this.uploads.createUploadUrlsService(ADMIN_UPLOAD_OWNER, dto);
    return { status: "ok", ...result };
  }

  /**
   * Persists an admin feed post from images already uploaded directly to
   * GCS via the upload-urls flow above.
   */
  @Post()
  @RateLimit(20)
  async create(@Body() dto: CreatePhotoDto) {
    return this.photos.adminCreate(dto.objectPaths, dto.caption);
  }

  @Delete(":id")
  @RateLimit(60)
  async remove(@Param("id") id: string) {
    await this.photos.adminDelete(id);
    return { status: "ok" };
  }
}
