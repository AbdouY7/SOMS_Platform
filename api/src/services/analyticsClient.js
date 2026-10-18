// src/services/analyticsClient.js
import axios from 'axios';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

const client = axios.create({
  baseURL: env.ANALYTICS_URL,
  timeout: 10_000, // 10 seconds as per spec
  headers: {
    'X-Internal-Key': env.INTERNAL_API_KEY,
    'Content-Type': 'application/json',
  },
});

// Retry once on network error
client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const config = err.config;
    if (!config || config.__retried) {
      // Map Flask errors to INTERNAL_ERROR
      const flaskMsg = err.response?.data?.error || 'Analytics service error';
      const flaskDetails = err.response?.data?.details;
      const status = err.response?.status;

      if (status === 400) {
        throw new AppError(flaskMsg, 400, 'VALIDATION_ERROR', flaskDetails);
      }

      if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
        logger.error({ err }, 'Analytics service unavailable');
        throw new AppError('Analytics service is unavailable', 503, 'INTERNAL_ERROR');
      }

      throw new AppError(flaskMsg, 500, 'INTERNAL_ERROR');
    }

    config.__retried = true;
    logger.warn({ err }, 'Retrying analytics request');
    return client(config);
  }
);

export const analyticsClient = client;
