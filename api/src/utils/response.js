// src/utils/response.js
// Thin alias so new modules can import { ok } from '../../utils/response.js'
// while the rest of the app still uses apiResponse.js directly.
export { ok, fail } from './apiResponse.js';
