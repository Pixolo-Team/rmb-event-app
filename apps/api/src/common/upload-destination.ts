import { mkdirSync } from "fs";

type DestinationCallback = (error: Error | null, destination: string) => void;

/**
 * Multer disk `destination` in FUNCTION form. This is deliberate: the string
 * form makes multer `mkdirp` the directory at module-load time, which crashes
 * boot on a read-only filesystem. As a function, multer skips that, and we
 * ensure the directory lazily per-upload — a read-only FS then fails a single
 * upload request instead of taking down the whole process at startup.
 */
export function ensureUploadDir(dir: string) {
  return (_req: unknown, _file: unknown, cb: DestinationCallback) => {
    try {
      mkdirSync(dir, { recursive: true });
      cb(null, dir);
    } catch (error) {
      cb(error as Error, dir);
    }
  };
}
