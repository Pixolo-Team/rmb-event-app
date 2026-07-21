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
