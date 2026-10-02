import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

/** Absolute folder for uploaded files, served at /api/uploads. */
export const UPLOAD_ROOT = path.resolve(process.cwd(), env.UPLOAD_DIR);
export const UPLOAD_URL_PREFIX = '/api/uploads';

const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/**
 * Multer middleware for a single image field. Files get random names so a
 * user-supplied filename can never be used for path tricks.
 */
export function imageUpload(subfolder: string) {
  const dir = path.join(UPLOAD_ROOT, subfolder);
  fs.mkdirSync(dir, { recursive: true });

  return multer({
    storage: multer.diskStorage({
      destination: dir,
      filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${IMAGE_TYPES[file.mimetype]}`),
    }),
    limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (IMAGE_TYPES[file.mimetype]) cb(null, true);
      else cb(AppError.badRequest('Only JPG, PNG or WebP images are allowed'));
    },
  }).single('image');
}

/** Public URL for a stored file, e.g. /api/uploads/products/123-abc.jpg */
export function uploadUrl(subfolder: string, filename: string): string {
  return `${UPLOAD_URL_PREFIX}/${subfolder}/${filename}`;
}

/** Deletes a previously uploaded file given its public URL. Ignores anything outside the upload folder. */
export function removeUpload(url: string | null | undefined): void {
  if (!url?.startsWith(`${UPLOAD_URL_PREFIX}/`)) return;
  const filePath = path.resolve(UPLOAD_ROOT, url.slice(UPLOAD_URL_PREFIX.length + 1));
  if (!filePath.startsWith(UPLOAD_ROOT + path.sep)) return;
  fs.promises.unlink(filePath).catch(() => undefined);
}
