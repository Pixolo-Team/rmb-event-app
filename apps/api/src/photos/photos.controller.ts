import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { PhotosService } from "./photos.service";
import { CreatePhotoDto } from "./dto/create-photo.dto";
import { AddCommentDto } from "./dto/add-comment.dto";
import { ListPhotosQueryDto } from "./dto/list-photos-query.dto";
import { SessionGuard, RequestWithAttendee } from "../session/session.guard";
import { RateLimit } from "../common/rate-limit/rate-limit.decorator";
import { RateLimitGuard } from "../common/rate-limit/rate-limit.guard";

@Controller("photos")
@UseGuards(SessionGuard, RateLimitGuard)
export class PhotosController {
  constructor(private readonly photos: PhotosService) {}

  /**
   * Persists a feed post from images already uploaded directly to GCS via
   * the /uploads/upload-urls flow.
   */
  @Post()
  @RateLimit(20)
  async create(@Req() req: RequestWithAttendee, @Body() dto: CreatePhotoDto) {
    return this.photos.create(req.attendeeId, dto.objectPaths, dto.caption);
  }

  @Get()
  async feed(@Req() req: RequestWithAttendee, @Query() query: ListPhotosQueryDto) {
    return this.photos.listFeed(req.attendeeId, query.cursor, query.limit);
  }

  @Post(":id/like")
  @RateLimit(120)
  async toggleLike(@Req() req: RequestWithAttendee, @Param("id") id: string) {
    return this.photos.toggleLike(id, req.attendeeId);
  }

  @Post(":id/comments")
  @RateLimit(30)
  async addComment(@Req() req: RequestWithAttendee, @Param("id") id: string, @Body() dto: AddCommentDto) {
    return this.photos.addComment(id, req.attendeeId, dto.message);
  }

  @Delete(":id")
  async remove(@Req() req: RequestWithAttendee, @Param("id") id: string) {
    await this.photos.selfDelete(id, req.attendeeId);
    return { status: "ok" };
  }
}
