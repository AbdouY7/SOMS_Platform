// src/modules/settings/settings.controller.js
import { ok } from '../../utils/apiResponse.js';
import { settingsService, SETTING_KEYS } from '../../services/settings.js';
import { AppError } from '../../utils/AppError.js';

const ip = (req) => req.ip ?? req.socket?.remoteAddress ?? null;

export async function getAllSettings(req, res, next) {
  try {
    const settings = await settingsService.getAll();
    return ok(res, settings);
  } catch (err) { next(err); }
}

export async function updateSetting(req, res, next) {
  try {
    const { key } = req.params;
    if (!SETTING_KEYS.includes(key)) {
      return next(new AppError(`Unknown setting key: ${key}`, 404, 'SETTING_NOT_FOUND'));
    }
    const result = await settingsService.set(key, req.body.value, req.user.id, ip(req));
    return ok(res, result);
  } catch (err) { next(err); }
}

export async function getPublicSettings(req, res, next) {
  try {
    const settings = await settingsService.getPublic();
    return ok(res, settings);
  } catch (err) { next(err); }
}
