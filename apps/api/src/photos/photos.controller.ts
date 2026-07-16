import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Express } from "express";
import { PhotosService } from "./photos.service";
import { CreatePhotoDto } from "./dto/create-photo.dto";
import { AddCommentDto } from "./dto/add-comment.dto";
import { SessionGuard, RequestWithAttendee } from "../session/session.guard";
import { photoUploadOptions } from "./photo-upload.config";

@Controller("photos")
@UseGuards(SessionGuard)
export class PhotosController {
  constructor(private readonly photos: PhotosService) {}

  @Post()
  @UseInterceptors(FileInterceptor("photo", photoUploadOptions))
  async create(
    @Req() req: RequestWithAttendee,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreatePhotoDto,
  ) {
    if (!file) throw new BadRequestException("No photo uploaded");
    return this.photos.create(req.attendeeId, file, dto.caption);
  }

  @Get()
  async feed(@Req() req: RequestWithAttendee, @Query("cursor") cursor?: string, @Query("limit") limit?: string) {
    return this.photos.listFeed(req.attendeeId, cursor, limit ? Number(limit) : undefined);
  }

  @Post(":id/like")
  async toggleLike(@Req() req: RequestWithAttendee, @Param("id") id: string) {
    return this.photos.toggleLike(id, req.attendeeId);
  }

  @Post(":id/comments")
  async addComment(@Req() req: RequestWithAttendee, @Param("id") id: string, @Body() dto: AddCommentDto) {
    return this.photos.addComment(id, req.attendeeId, dto.message);
  }

  @Delete(":id")
  async remove(@Req() req: RequestWithAttendee, @Param("id") id: string) {
    await this.photos.selfDelete(id, req.attendeeId);
    return { status: "ok" };
  }
}
