// src/middleware/upload.js
// multer memory storage with magic-byte file type check.
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const storage = multer.memoryStorage();

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new AppError('Only JPEG, PNG and WebP images are allowed', 400, 'VALIDATION_ERROR'));
  }
  cb(null, true);
}

export const uploadImage = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter,
}).single('image');

/**
 * Express middleware: after multer runs, verifies magic bytes with file-type.
 */
export async function verifyMagicBytes(req, res, next) {
  if (!req.file) return next();
  try {
    const detected = await fileTypeFromBuffer(req.file.buffer);
    if (!detected || !ALLOWED_MIME.has(detected.mime)) {
      return next(new AppError('File content does not match allowed image types', 400, 'VALIDATION_ERROR'));
    }
    next();
  } catch (err) {
    next(err);
  }
}
