import {
  Body,
  Controller,
  Delete,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";

import { CompleteUploadRequestData } from "./dto/complete-upload.request";
import { CreateDownloadUrlRequestData } from "./dto/create-download-url.request";
import { CreateUploadUrlRequestData } from "./dto/create-upload-url.request";
import { UploadsService } from "./uploads.service";

interface AuthenticatedRequestData extends Request {
  user?: {
    id: string;
  };
}

@Controller("uploads")
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post("upload-url")
  createUploadUrl(
    @Req() request: AuthenticatedRequestData,
    @Body() requestData: CreateUploadUrlRequestData,
  ) {
    const userId = this.getAuthenticatedUserId(request);

    return this.uploadsService.createUploadUrlService(userId, requestData);
  }

  @Post("complete")
  completeUpload(
    @Req() request: AuthenticatedRequestData,
    @Body() requestData: CompleteUploadRequestData,
  ) {
    const userId = this.getAuthenticatedUserId(request);

    return this.uploadsService.completeUploadService(
      userId,
      requestData.category,
      requestData.objectPath,
    );
  }

  @Post("download-url")
  createDownloadUrl(
    @Req() request: AuthenticatedRequestData,
    @Body() requestData: CreateDownloadUrlRequestData,
  ) {
    const userId = this.getAuthenticatedUserId(request);

    return this.uploadsService.createDownloadUrlService(
      userId,
      requestData.objectPath,
    );
  }

  @Delete()
  async deleteUpload(
    @Req() request: AuthenticatedRequestData,
    @Body() requestData: CreateDownloadUrlRequestData,
  ): Promise<{ success: true }> {
    const userId = this.getAuthenticatedUserId(request);

    await this.uploadsService.deleteObjectService(
      userId,
      requestData.objectPath,
    );

    return {
      success: true,
    };
  }

  private getAuthenticatedUserId(request: AuthenticatedRequestData): string {
    const userId = request.user?.id;

    if (!userId) {
      throw new UnauthorizedException();
    }

    return userId;
  }
}
