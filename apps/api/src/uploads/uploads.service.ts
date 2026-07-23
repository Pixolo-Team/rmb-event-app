import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Storage } from "@google-cloud/storage";
import { randomUUID } from "node:crypto";

import { CompleteUploadsRequestData } from "./dto/complete-uploads.request";
import { CreateUploadUrlRequestData } from "./dto/create-upload-url.request";
import { CreateUploadUrlsRequestData } from "./dto/create-upload-urls.request";
import {
  AllowedImageContentTypeData,
  CompletedUploadData,
  SignedDownloadData,
  SignedUploadData,
  UploadCategories,
  allowedImageContentTypes,
} from "./upload.types";

interface CreateUploadUrlsResponseData {
  uploads: SignedUploadData[];
}

interface CompleteUploadsResponseData {
  uploads: CompletedUploadData[];
}

// Owner-path segment used for uploads that aren't tied to an attendee
// (admin-authored feed posts, the event chair photo).
export const ADMIN_UPLOAD_OWNER = "admin";

@Injectable()
export class UploadsService {
  private readonly storage = new Storage();

  private readonly bucketName: string;

  private readonly uploadUrlTtlSeconds: number;

  private readonly downloadUrlTtlSeconds: number;

  private readonly maximumProfilePhotoBytes: number;

  private readonly maximumFeedPhotoBytes: number;

  constructor(private readonly configService: ConfigService) {
    const bucketName = this.configService.get<string>("GCS_BUCKET_NAME");

    if (!bucketName) {
      throw new Error("GCS_BUCKET_NAME must be configured");
    }

    this.bucketName = bucketName;

    this.uploadUrlTtlSeconds = this.getPositiveNumberConfig(
      "GCS_UPLOAD_URL_TTL_SECONDS",
      600,
    );

    this.downloadUrlTtlSeconds = this.getPositiveNumberConfig(
      "GCS_READ_URL_TTL_SECONDS",
      3600,
    );

    this.maximumProfilePhotoBytes = this.getPositiveNumberConfig(
      "GCS_MAX_PROFILE_PHOTO_BYTES",
      524_288,
    );

    this.maximumFeedPhotoBytes = this.getPositiveNumberConfig(
      "GCS_MAX_FEED_PHOTO_BYTES",
      2_097_152,
    );
  }

  /**
   * Creates a signed URL for uploading one image directly to Cloud Storage.
   */
  async createUploadUrlService(
    attendeeId: string,
    requestData: CreateUploadUrlRequestData,
  ): Promise<SignedUploadData> {
    const extension = this.getExtensionFromContentType(requestData.contentType);

    const objectPath = this.createObjectPath(
      attendeeId,
      requestData.category,
      extension,
    );

    const expiresAtDate = new Date(
      Date.now() + this.uploadUrlTtlSeconds * 1_000,
    );

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
        contentType: requestData.contentType,
        expiresAt: expiresAtDate.toISOString(),
        requiredHeaders: {
          "Content-Type": requestData.contentType,
          "x-goog-if-generation-match": "0",
        },
      };
    } catch (error: unknown) {
      console.error("Failed to create signed upload URL", error);

      throw new InternalServerErrorException(
        "Could not prepare the image upload",
      );
    }
  }

  /**
   * Creates signed URLs for uploading multiple images.
   */
  async createUploadUrlsService(
    attendeeId: string,
    requestData: CreateUploadUrlsRequestData,
  ): Promise<CreateUploadUrlsResponseData> {
    this.assertValidImageCount(requestData.category, requestData.files.length);

    const uploads = await Promise.all(
      requestData.files.map(async (fileData) => {
        return this.createUploadUrlService(attendeeId, {
          category: requestData.category,
          contentType: fileData.contentType,
        });
      }),
    );

    return {
      uploads,
    };
  }

  /**
   * Verifies one uploaded Cloud Storage object.
   */
  async completeUploadService(
    attendeeId: string,
    category: UploadCategories,
    objectPath: string,
  ): Promise<CompletedUploadData> {
    this.assertObjectBelongsToAttendee(attendeeId, objectPath);

    this.assertCategoryMatchesObjectPath(category, objectPath);

    const file = this.storage.bucket(this.bucketName).file(objectPath);

    let metadata: {
      size?: string | number;
      contentType?: string;
    };

    try {
      const [fileMetadata] = await file.getMetadata();

      metadata = fileMetadata;
    } catch (error: unknown) {
      console.error("Could not read uploaded file metadata", error);

      throw new NotFoundException("The uploaded image was not found");
    }

    const contentType = metadata.contentType ?? "";
    const sizeBytes = Number(metadata.size ?? 0);

    const isContentTypeAllowed = allowedImageContentTypes.includes(
      contentType as AllowedImageContentTypeData,
    );

    const maximumSizeBytes = this.getMaximumSizeBytes(category);

    const isSizeAllowed =
      Number.isFinite(sizeBytes) &&
      sizeBytes > 0 &&
      sizeBytes <= maximumSizeBytes;

    if (!isContentTypeAllowed || !isSizeAllowed) {
      await file.delete({
        ignoreNotFound: true,
      });

      if (!isContentTypeAllowed) {
        throw new BadRequestException(
          "The uploaded file is not a supported image type",
        );
      }

      throw new BadRequestException(
        `The uploaded image exceeds the maximum size of ${maximumSizeBytes} bytes`,
      );
    }

    return {
      objectPath,
      contentType,
      sizeBytes,
    };
  }

  /**
   * Verifies multiple uploaded Cloud Storage objects.
   */
  async completeUploadsService(
    attendeeId: string,
    requestData: CompleteUploadsRequestData,
  ): Promise<CompleteUploadsResponseData> {
    this.assertValidImageCount(requestData.category, requestData.files.length);

    const uploads = await Promise.all(
      requestData.files.map(async (fileData) => {
        return this.completeUploadService(
          attendeeId,
          requestData.category,
          fileData.objectPath,
        );
      }),
    );

    return {
      uploads,
    };
  }

  /**
   * Creates a temporary signed URL for reading a private object.
   *
   * Feed images are visible to every authenticated attendee (the feed is a
   * shared social wall), so only profile images are owner-restricted.
   */
  async createDownloadUrlService(
    attendeeId: string,
    objectPath: string,
  ): Promise<SignedDownloadData> {
    this.assertObjectPathIsSafe(objectPath);

    const category = this.getCategoryFromObjectPath(objectPath);

    if (category === UploadCategories.Profile) {
      // This permits only the owner to request their profile image.
      // Remove this restriction when public attendee profiles should
      // display profile photos through signed URLs.
      this.assertObjectBelongsToAttendee(attendeeId, objectPath);
    }

    const file = this.storage.bucket(this.bucketName).file(objectPath);

    const [doesFileExist] = await file.exists();

    if (!doesFileExist) {
      throw new NotFoundException("The requested image was not found");
    }

    const expiresAtDate = new Date(
      Date.now() + this.downloadUrlTtlSeconds * 1_000,
    );

    try {
      const [downloadUrl] = await file.getSignedUrl({
        version: "v4",
        action: "read",
        expires: expiresAtDate,
      });

      return {
        downloadUrl,
        expiresAt: expiresAtDate.toISOString(),
      };
    } catch (error: unknown) {
      console.error("Failed to create signed download URL", error);

      throw new InternalServerErrorException("Could not prepare the image");
    }
  }

  /**
   * Deletes an object owned by the authenticated attendee.
   */
  async deleteUploadService(
    attendeeId: string,
    objectPath: string,
  ): Promise<void> {
    this.assertObjectBelongsToAttendee(attendeeId, objectPath);

    await this.storage.bucket(this.bucketName).file(objectPath).delete({
      ignoreNotFound: true,
    });
  }

  /**
   * Resolves a stored profile object path to a signed, time-limited read URL
   * for embedding directly in an API response (e.g. Attendee.photoUrl).
   *
   * Returns null if the path isn't a recognised GCS object path (e.g. a
   * legacy local-disk avatar path) or the object no longer exists.
   */
  async resolveProfilePhotoUrl(objectPath: string): Promise<string | null> {
    return this.resolveObjectDownloadUrl(objectPath, /^profile\//);
  }

  /**
   * Resolves a stored feed object path (attendee or admin-authored) to a
   * signed, time-limited read URL. Feed posts are visible to every
   * authenticated attendee, so this performs no ownership check — any
   * caller who can reach the feed can resolve any feed image.
   *
   * Returns null for legacy local-disk paths (e.g. "/uploads/photos/...")
   * or objects that no longer exist, so callers can fall back gracefully.
   */
  async resolveFeedPhotoUrl(objectPath: string): Promise<string | null> {
    return this.resolveObjectDownloadUrl(objectPath, /^feed\//);
  }

  private async resolveObjectDownloadUrl(
    objectPath: string,
    categoryPrefix: RegExp,
  ): Promise<string | null> {
    if (
      !categoryPrefix.test(objectPath) ||
      !/^(profile|feed)\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9-]+\.(jpg|jpeg|png|webp)$/.test(
        objectPath,
      )
    ) {
      return null;
    }

    const file = this.storage.bucket(this.bucketName).file(objectPath);

    const [doesFileExist] = await file.exists();
    if (!doesFileExist) {
      return null;
    }

    const expiresAtDate = new Date(
      Date.now() + this.downloadUrlTtlSeconds * 1_000,
    );

    try {
      const [downloadUrl] = await file.getSignedUrl({
        version: "v4",
        action: "read",
        expires: expiresAtDate,
      });

      return downloadUrl;
    } catch (error: unknown) {
      console.error("Failed to create signed download URL", error);
      return null;
    }
  }

  private createObjectPath(
    attendeeId: string,
    category: UploadCategories,
    extension: string,
  ): string {
    const objectId = randomUUID();

    return `${category}/${attendeeId}/${objectId}.${extension}`;
  }

  private getExtensionFromContentType(
    contentType: AllowedImageContentTypeData,
  ): string {
    const extensions: Record<AllowedImageContentTypeData, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };

    return extensions[contentType];
  }

  private getMaximumSizeBytes(category: UploadCategories): number {
    if (category === UploadCategories.Profile) {
      return this.maximumProfilePhotoBytes;
    }

    return this.maximumFeedPhotoBytes;
  }

  private assertValidImageCount(
    category: UploadCategories,
    imageCount: number,
  ): void {
    if (category === UploadCategories.Profile && imageCount !== 1) {
      throw new BadRequestException(
        "A profile upload must contain exactly one image",
      );
    }

    if (
      category === UploadCategories.Feed &&
      (imageCount < 1 || imageCount > 10)
    ) {
      throw new BadRequestException(
        "A feed upload must contain between one and ten images",
      );
    }
  }

  private assertObjectBelongsToAttendee(
    attendeeId: string,
    objectPath: string,
  ): void {
    this.assertObjectPathIsSafe(objectPath);

    const objectParts = objectPath.split("/");
    const objectAttendeeId = objectParts[1];

    if (objectAttendeeId !== attendeeId) {
      throw new BadRequestException(
        "The uploaded image does not belong to this attendee",
      );
    }
  }

  private assertCategoryMatchesObjectPath(
    category: UploadCategories,
    objectPath: string,
  ): void {
    const objectCategory = this.getCategoryFromObjectPath(objectPath);

    if (objectCategory !== category) {
      throw new BadRequestException(
        "The image category does not match its object path",
      );
    }
  }

  private getCategoryFromObjectPath(objectPath: string): UploadCategories {
    this.assertObjectPathIsSafe(objectPath);

    const category = objectPath.split("/")[0];

    if (category === UploadCategories.Profile) {
      return UploadCategories.Profile;
    }

    return UploadCategories.Feed;
  }

  private assertObjectPathIsSafe(objectPath: string): void {
    const isObjectPathSafe =
      !objectPath.includes("..") &&
      !objectPath.startsWith("/") &&
      /^(profile|feed)\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9-]+\.(jpg|jpeg|png|webp)$/.test(
        objectPath,
      );

    if (!isObjectPathSafe) {
      throw new BadRequestException("Invalid image object path");
    }
  }

  private getPositiveNumberConfig(key: string, fallbackValue: number): number {
    const rawValue = this.configService.get<string>(key);

    if (!rawValue) {
      return fallbackValue;
    }

    const parsedValue = Number(rawValue);

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      throw new Error(`${key} must be a positive number`);
    }

    return parsedValue;
  }
}
