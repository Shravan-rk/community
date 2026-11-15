import rateLimit from 'express-rate-limit';
import { env } from '../env.js';

const message = {
  error: {
    code: 'RATE_LIMITED',
    message: 'Too many requests. Please slow down and try again shortly.',
  },
};

export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message,
});
