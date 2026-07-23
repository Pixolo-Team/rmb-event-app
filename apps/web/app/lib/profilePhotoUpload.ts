import { assignProfilePhoto, completeUpload, requestUploadUrl, uploadToSignedUrl, type AllowedImageContentType } from "./uploadsRequests";

export interface ProfilePhotoUploadResult {
  photoUrl: string;
}

// Takes an already-compressed photo (see compressProfilePhotoForUpload in
// imageCompression.ts) through the signed-URL upload flow: request a signed
// GCS URL, PUT the file directly to it, verify the upload, then assign it as
// the attendee's profile photo.
export async function uploadProfilePhoto(file: File): Promise<ProfilePhotoUploadResult> {
  const contentType = file.type as AllowedImageContentType;

  const upload = await requestUploadUrl("profile", contentType);
  await uploadToSignedUrl(upload.uploadUrl, upload.requiredHeaders, file);
  await completeUpload("profile", upload.objectPath);
  const photoUrl = await assignProfilePhoto(upload.objectPath);

  return { photoUrl };
}
