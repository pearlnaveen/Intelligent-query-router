import rateLimit from 'express-rate-limit';

/**
 * Rate limiter middleware for chatbot endpoints
 * Limits each IP to 30 chat messages per minute
 */
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    error: 'Too many chat requests from this IP, please try again after a minute.'
  }
});

/**
 * General API endpoint rate limiter
 * Limits general requests (like health checks) to 100 per minute
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests, please try again later.'
  }
});
