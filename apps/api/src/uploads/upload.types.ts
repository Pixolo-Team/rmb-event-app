export enum UploadCategories {
  Profile = "profile",
  Feed = "feed",
}

export const allowedImageContentTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedImageContentTypeData =
  (typeof allowedImageContentTypes)[number];

export interface SignedUploadData {
  uploadUrl: string;
  objectPath: string;
  contentType: AllowedImageContentTypeData;
  expiresAt: string;
  requiredHeaders: {
    "Content-Type": AllowedImageContentTypeData;
    "x-goog-if-generation-match": string;
  };
}

export interface CompletedUploadData {
  objectPath: string;
  contentType: string;
  sizeBytes: number;
}

export interface SignedDownloadData {
  downloadUrl: string;
  expiresAt: string;
}
