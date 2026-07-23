"use client";

import imageCompression from "browser-image-compression";

async function compressImage(file: File, options: Parameters<typeof imageCompression>[1]): Promise<File> {
  try {
    const compressed = await imageCompression(file, options);
    if (process.env.NODE_ENV !== "production") {
      const originalKb = Math.round(file.size / 1024);
      const compressedKb = Math.round(compressed.size / 1024);
      // eslint-disable-next-line no-console
      console.info(`[image-compression] ${file.name}: ${originalKb}KB -> ${compressedKb}KB`);
    }
    return compressed;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(`[image-compression] failed for ${file.name}; uploading original`, error);
    }
    return file;
  }
}

export function compressProfileImage(file: File): Promise<File> {
  return compressImage(file, {
    maxSizeMB: 0.35,
    maxWidthOrHeight: 800,
    initialQuality: 0.9,
    fileType: "image/jpeg",
    useWebWorker: true,
  });
}

export function compressFeedImage(file: File): Promise<File> {
  return compressImage(file, {
    maxSizeMB: 1.2,
    maxWidthOrHeight: 2000,
    initialQuality: 0.86,
    fileType: "image/jpeg",
    useWebWorker: true,
  });
}

const PROFILE_UPLOAD_MAX_DIMENSION = 600;
const PROFILE_UPLOAD_MAX_BYTES = 524_288; // 512KB
const PROFILE_UPLOAD_INITIAL_QUALITY = 0.82;
const PROFILE_UPLOAD_MIN_QUALITY = 0.55;
const PROFILE_UPLOAD_QUALITY_STEP = 0.09;

// Resizes to fit within 600x600 and compresses to JPEG, stepping quality down
// from 0.82 to ~0.55 until the file is at most 512KB. Throws if it still
// doesn't fit at the lowest quality, so the caller can surface an error.
export async function compressProfilePhotoForUpload(file: File): Promise<File> {
  const image = await loadImage(file);
  const { width, height } = fitWithinDimensions(image.naturalWidth, image.naturalHeight, PROFILE_UPLOAD_MAX_DIMENSION);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser can't process this image.");
  ctx.drawImage(image, 0, 0, width, height);

  for (let quality = PROFILE_UPLOAD_INITIAL_QUALITY; quality >= PROFILE_UPLOAD_MIN_QUALITY - 0.001; quality -= PROFILE_UPLOAD_QUALITY_STEP) {
    const blob = await canvasToBlob(canvas, "image/jpeg", quality);
    if (blob && blob.size <= PROFILE_UPLOAD_MAX_BYTES) {
      return new File([blob], "profile-photo.jpg", { type: "image/jpeg" });
    }
  }

  throw new Error("This photo is still larger than 512KB after compression. Try a smaller or simpler image.");
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read that image."));
    };
    image.src = url;
  });
}

function fitWithinDimensions(width: number, height: number, maxDimension: number): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) return { width, height };
  const scale = maxDimension / Math.max(width, height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}
