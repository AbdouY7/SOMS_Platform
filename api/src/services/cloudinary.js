// src/services/cloudinary.js
// Cloudinary upload/delete helpers.
// If CLOUDINARY credentials are not set, operations are no-ops (returns placeholder).
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';

const configured = !!(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);

if (configured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Upload an image buffer to Cloudinary.
 * @param {Buffer} buffer
 * @param {string} folder  e.g. 'soms/companies/uuid'
 * @returns {{ url: string, publicId: string }}
 */
export async function uploadImage(buffer, folder) {
  if (!configured) {
    logger.warn('Cloudinary not configured — upload skipped');
    return { url: null, publicId: null };
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 800, crop: 'limit', quality: 'auto' }],
      },
      (err, result) => {
        if (err) return reject(new AppError('Image upload failed', 500, 'INTERNAL_ERROR'));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    Readable.from(buffer).pipe(uploadStream);
  });
}

/**
 * Delete an image from Cloudinary by public_id.
 */
export async function deleteImage(publicId) {
  if (!configured || !publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    logger.error({ err, publicId }, 'Cloudinary delete failed');
  }
}
