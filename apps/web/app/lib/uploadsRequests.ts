import { withCsrfHeaders } from "./csrf";

export type UploadCategory = "profile" | "feed";
export type AllowedImageContentType = "image/jpeg" | "image/png" | "image/webp";

export interface SignedUpload {
  uploadUrl: string;
  objectPath: string;
  contentType: AllowedImageContentType;
  expiresAt: string;
  requiredHeaders: Record<string, string>;
}

export interface CompletedUpload {
  objectPath: string;
  contentType: string;
  sizeBytes: number;
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null) as { message?: string } | null;
  return body?.message ?? fallback;
}

export async function requestUploadUrl(category: UploadCategory, contentType: AllowedImageContentType): Promise<SignedUpload> {
  const res = await fetch("/api/uploads/upload-url", withCsrfHeaders({
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, contentType }),
  }));

  if (!res.ok) throw new Error(await readErrorMessage(res, "Couldn't prepare the photo upload."));

  const data = await res.json() as { status: string; upload: SignedUpload };
  return data.upload;
}

// Uploads directly to Google Cloud Storage. No cookies or CSRF headers —
// this request goes to a different origin than our API.
export async function uploadToSignedUrl(uploadUrl: string, requiredHeaders: Record<string, string>, file: Blob): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: requiredHeaders,
    body: file,
  });

  if (!res.ok) throw new Error("Couldn't upload the photo. Try again.");
}

export async function completeUpload(category: UploadCategory, objectPath: string): Promise<CompletedUpload> {
  const res = await fetch("/api/uploads/complete", withCsrfHeaders({
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, objectPath }),
  }));

  if (!res.ok) throw new Error(await readErrorMessage(res, "Couldn't verify the uploaded photo."));

  const data = await res.json() as { status: string; upload: CompletedUpload };
  return data.upload;
}

export async function assignProfilePhoto(objectPath: string): Promise<string> {
  const res = await fetch("/api/attendees/me/photo", withCsrfHeaders({
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ objectPath }),
  }));

  if (!res.ok) throw new Error(await readErrorMessage(res, "Couldn't update your profile photo."));

  const data = await res.json() as { status: string; photoUrl: string };
  return data.photoUrl;
}
