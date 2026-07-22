import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Storage } from "@google-cloud/storage";
import { randomUUID } from "node:crypto";

import {
  CreateUploadUrlRequestData,
  UploadCategories,
} from "./dto/create-upload-url.request";

interface CreateUploadUrlResponseData {
  uploadUrl: string;
  objectPath: string;
  expiresAt: string;
  requiredHeaders: {
    "Content-Type": string;
    "x-goog-if-generation-match": string;
  };
}

interface CompleteUploadResponseData {
  objectPath: string;
  contentType: string;
  size: number;
}

interface CreateDownloadUrlResponseData {
  downloadUrl: string;
  expiresAt: string;
}

@Injectable()
export class UploadsService {
  private readonly storage = new Storage();
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    const bucketName = this.configService.get<string>("GCS_BUCKET_NAME");

    if (!bucketName) {
      throw new Error("GCS_BUCKET_NAME must be configured");
    }

    this.bucketName = bucketName;
  }

  /**
   * Creates a time-limited Cloud Storage URL for a direct client upload.
   */
  async createUploadUrlService(
    userId: string,
    requestData: CreateUploadUrlRequestData,
  ): Promise<CreateUploadUrlResponseData> {
    const extension = this.getExtensionFromContentType(requestData.contentType);

    const objectPath = this.createObjectPath(
      userId,
      requestData.category,
      extension,
    );

    const uploadUrlTtlSeconds = Number(
      this.configService.get<string>("GCS_UPLOAD_URL_TTL_SECONDS") ?? 600,
    );

    const expiresAtDate = new Date(Date.now() + uploadUrlTtlSeconds * 1_000);

    const file = this.storage.bucket(this.bucketName).file(objectPath);

    try {
      const [uploadUrl] = await file.getSignedUrl({
        version: "v4",
        action: "write",
        expires: expiresAtDate,
        contentType: requestData.contentType,
        extensionHeaders: {
          "x-goog-if-generation-match": "0",
        },
      });

      return {
        uploadUrl,
        objectPath,
        expiresAt: expiresAtDate.toISOString(),
        requiredHeaders: {
          "Content-Type": requestData.contentType,
          "x-goog-if-generation-match": "0",
        },
      };
    } catch (error: unknown) {
      console.error("Failed to create upload signed URL", error);

      throw new InternalServerErrorException(
        "Could not prepare the image upload",
      );
    }
  }

  /**
   * Verifies that an uploaded object exists and satisfies upload rules.
   */
  async completeUploadService(
    userId: string,
    category: UploadCategories,
    objectPath: string,
  ): Promise<CompleteUploadResponseData> {
    this.assertObjectBelongsToUser(userId, objectPath);

    const file = this.storage.bucket(this.bucketName).file(objectPath);

    let metadata: {
      size?: string | number;
      contentType?: string;
    };

    try {
      const [fileMetadata] = await file.getMetadata();
      metadata = fileMetadata;
    } catch {
      throw new NotFoundException("Uploaded image was not found");
    }

    const contentType = metadata.contentType ?? "";
    const size = Number(metadata.size ?? 0);

    const allowedContentTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);

    const maximumSize = this.getMaximumSize(category);

    const isContentTypeAllowed = allowedContentTypes.has(contentType);
    const isSizeAllowed = size > 0 && size <= maximumSize;

    if (!isContentTypeAllowed || !isSizeAllowed) {
      await file.delete({ ignoreNotFound: true });

      throw new BadRequestException(
        `Invalid image. Maximum allowed size is ${maximumSize} bytes.`,
      );
    }

    return {
      objectPath,
      contentType,
      size,
    };
  }

  /**
   * Creates a temporary URL for viewing a private object.
   */
  async createDownloadUrlService(
    userId: string,
    objectPath: string,
  ): Promise<CreateDownloadUrlResponseData> {
    // Replace this ownership check with your actual feed/profile access rules.
    this.assertObjectPathIsSafe(objectPath);

    const file = this.storage.bucket(this.bucketName).file(objectPath);

    const [doesFileExist] = await file.exists();

    if (!doesFileExist) {
      throw new NotFoundException("Image was not found");
    }

    const readUrlTtlSeconds = Number(
      this.configService.get<string>("GCS_READ_URL_TTL_SECONDS") ?? 3600,
    );

    const expiresAtDate = new Date(Date.now() + readUrlTtlSeconds * 1_000);

    const [downloadUrl] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: expiresAtDate,
    });

    return {
      downloadUrl,
      expiresAt: expiresAtDate.toISOString(),
    };
  }

  /**
   * Deletes an object that belongs to the authenticated user.
   */
  async deleteObjectService(userId: string, objectPath: string): Promise<void> {
    this.assertObjectBelongsToUser(userId, objectPath);

    await this.storage.bucket(this.bucketName).file(objectPath).delete({
      ignoreNotFound: true,
    });
  }

  private createObjectPath(
    userId: string,
    category: UploadCategories,
    extension: string,
  ): string {
    const objectId = randomUUID();

    return `${category}/${userId}/${objectId}.${extension}`;
  }

  private getExtensionFromContentType(contentType: string): string {
    const extensions: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };

    const extension = extensions[contentType];

    if (!extension) {
      throw new BadRequestException("Unsupported image type");
    }

    return extension;
  }

  private getMaximumSize(category: UploadCategories): number {
    if (category === UploadCategories.Profile) {
      return Number(
        this.configService.get<string>("GCS_MAX_PROFILE_PHOTO_BYTES") ??
          524_288,
      );
    }

    return Number(
      this.configService.get<string>("GCS_MAX_FEED_PHOTO_BYTES") ?? 2_097_152,
    );
  }

  private assertObjectBelongsToUser(userId: string, objectPath: string): void {
    this.assertObjectPathIsSafe(objectPath);

    const objectParts = objectPath.split("/");
    const objectUserId = objectParts[1];

    if (objectUserId !== userId) {
      throw new BadRequestException("The image does not belong to this user");
    }
  }

  private assertObjectPathIsSafe(objectPath: string): void {
    const isObjectPathSafe =
      !objectPath.includes("..") &&
      !objectPath.startsWith("/") &&
      /^(profile|feed)\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9-]+\.(jpg|jpeg|png|webp)$/.test(
        objectPath,
      );

    if (!isObjectPathSafe) {
      throw new BadRequestException("Invalid object path");
    }
  }
}
