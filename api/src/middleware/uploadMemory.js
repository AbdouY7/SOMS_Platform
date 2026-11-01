// src/middleware/uploadMemory.js
// multer with memoryStorage — the imports service writes its own temp file.
// (Your existing upload.js from System 2 stays as is.)
import path from 'node:path';
import multer from 'multer';
import { AppError } from '../utils/AppError.js';

const MAX_BYTES = 50 * 1024 * 1024; // hard cap = max allowed value of import_max_file_mb; the service enforces the live setting

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ext !== '.csv') return cb(new AppError('Only .csv files are accepted', 400, 'INVALID_FILE_TYPE'));
    return cb(null, true);
  },
});

/** Express middleware: single file in the "file" field, multer errors converted to AppError. */
export function uploadCsv(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'The file is too large' : err.message;
      return next(new AppError(message, 400, 'UPLOAD_ERROR'));
    }
    return next(err);
  });
}
