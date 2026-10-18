// src/config/helmet.js
import helmetPkg from 'helmet';

export const helmetOptions = helmetPkg({
  // Default helmet config for API-only usage
  contentSecurityPolicy: false, // API does not serve HTML
});
