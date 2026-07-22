import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import { RequestWithAttendee, SessionGuard } from "../session/session.guard";

import { CompleteUploadRequestData } from "./dto/complete-upload.request";
import { CompleteUploadsRequestData } from "./dto/complete-uploads.request";
import { CreateDownloadUrlRequestData } from "./dto/create-download-url.request";
import { CreateUploadUrlRequestData } from "./dto/create-upload-url.request";
import { CreateUploadUrlsRequestData } from "./dto/create-upload-urls.request";
import { DeleteUploadRequestData } from "./dto/delete-upload.request";
import { UploadsService } from "./uploads.service";

@Controller("uploads")
@UseGuards(SessionGuard)
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  /**
   * Generates one signed upload URL.
   *
   * Useful for a profile photo or one feed image.
   */
  @Post("upload-url")
  async createUploadUrl(
    @Req() req: RequestWithAttendee,
    @Body() dto: CreateUploadUrlRequestData,
  ) {
    const upload = await this.uploads.createUploadUrlService(
      req.attendeeId,
      dto,
    );

    return {
      status: "ok",
      upload,
    };
  }

  /**
   * Generates signed upload URLs for multiple images.
   */
  @Post("upload-urls")
  async createUploadUrls(
    @Req() req: RequestWithAttendee,
    @Body() dto: CreateUploadUrlsRequestData,
  ) {
    const result = await this.uploads.createUploadUrlsService(
      req.attendeeId,
      dto,
    );

    return {
      status: "ok",
      ...result,
    };
  }

  /**
   * Verifies one file after the client uploads it.
   */
  @Post("complete")
  async completeUpload(
    @Req() req: RequestWithAttendee,
    @Body() dto: CompleteUploadRequestData,
  ) {
    const upload = await this.uploads.completeUploadService(
      req.attendeeId,
      dto.category,
      dto.objectPath,
    );

    return {
      status: "ok",
      upload,
    };
  }

  /**
   * Verifies multiple files after the client uploads them.
   */
  @Post("complete-many")
  async completeUploads(
    @Req() req: RequestWithAttendee,
    @Body() dto: CompleteUploadsRequestData,
  ) {
    const result = await this.uploads.completeUploadsService(
      req.attendeeId,
      dto,
    );

    return {
      status: "ok",
      ...result,
    };
  }

  /**
   * Generates a temporary signed URL for viewing a private image.
   */
  @Post("download-url")
  async createDownloadUrl(
    @Req() req: RequestWithAttendee,
    @Body() dto: CreateDownloadUrlRequestData,
  ) {
    const result = await this.uploads.createDownloadUrlService(
      req.attendeeId,
      dto.objectPath,
    );

    return {
      status: "ok",
      ...result,
    };
  }

  /**
   * Deletes an uploaded object owned by the attendee.
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  async deleteUpload(
    @Req() req: RequestWithAttendee,
    @Body() dto: DeleteUploadRequestData,
  ) {
    await this.uploads.deleteUploadService(req.attendeeId, dto.objectPath);

    return {
      status: "ok",
    };
  }
}
