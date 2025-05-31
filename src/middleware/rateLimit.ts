import rateLimit from "express-rate-limit";
import { Request, Response } from "express";
import { config } from "../config";
import { AuthenticatedRequest, ApiResponse } from "../types";
import { logger } from "../config/logger";

// Create rate limiter based on user plan
const createRateLimiter = (
  maxRequests: number,
  windowMs: number = config.rateLimit.windowMs
) => {
  return rateLimit({
    windowMs,
    max: (req: Request) => {
      const authenticatedReq = req as AuthenticatedRequest;
      if (authenticatedReq.user?.plan === "PREMIUM") {
        return config.rateLimit.maxRequestsPremium;
      }
      return maxRequests;
    },
    message: (req: Request) => {
      const authenticatedReq = req as AuthenticatedRequest;
      const isPremium = authenticatedReq.user?.plan === "PREMIUM";

      const response: ApiResponse = {
        success: false,
        error: `Rate limit exceeded. ${
          isPremium ? "Premium" : "Free"
        } users are limited to ${
          isPremium ? config.rateLimit.maxRequestsPremium : maxRequests
        } requests per ${Math.floor(windowMs / 60000)} minutes.`,
      };

      return response;
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      const authenticatedReq = req as AuthenticatedRequest;
      // Use user ID if authenticated, otherwise fall back to IP
      return authenticatedReq.user?.id || req.ip || "anonymous";
    },
    handler: (req: Request, res: Response) => {
      const authenticatedReq = req as AuthenticatedRequest;
      logger.warn("Rate limit exceeded", {
        userId: authenticatedReq.user?.id || "anonymous",
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        endpoint: req.originalUrl,
      });

      const isPremium = authenticatedReq.user?.plan === "PREMIUM";
      const response: ApiResponse = {
        success: false,
        error: `Rate limit exceeded. ${
          isPremium ? "Premium" : "Free"
        } users are limited to ${
          isPremium ? config.rateLimit.maxRequestsPremium : maxRequests
        } requests per ${Math.floor(windowMs / 60000)} minutes.`,
      };

      res.status(429).json(response);
    },
  });
};

// Different rate limiters for different endpoints
export const generalRateLimit = createRateLimiter(
  config.rateLimit.maxRequestsFree
);

export const authRateLimit = createRateLimiter(5, 15 * 60 * 1000); // 5 requests per 15 minutes

export const summaryRateLimit = createRateLimiter(3, 60 * 1000); // 3 summary generations per minute

export const strictRateLimit = createRateLimiter(2, 60 * 1000); // 2 requests per minute

// Special rate limiter for password reset
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour per IP
  message: {
    success: false,
    error: "Too many password reset attempts. Please try again in an hour.",
  },
  keyGenerator: (req: Request) => req.ip || "anonymous",
  handler: (req: Request, res: Response) => {
    logger.warn("Password reset rate limit exceeded", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.status(429).json({
      success: false,
      error: "Too many password reset attempts. Please try again in an hour.",
    });
  },
});

// Rate limiter for email verification
export const emailVerificationRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 attempts per 5 minutes
  message: {
    success: false,
    error:
      "Too many email verification attempts. Please try again in 5 minutes.",
  },
  keyGenerator: (req: Request) => req.ip || "anonymous",
});
