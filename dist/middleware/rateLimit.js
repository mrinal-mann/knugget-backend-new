"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailVerificationRateLimit = exports.passwordResetRateLimit = exports.strictRateLimit = exports.summaryRateLimit = exports.authRateLimit = exports.generalRateLimit = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = require("../config");
const logger_1 = require("../config/logger");
const createRateLimiter = (maxRequests, windowMs = config_1.config.rateLimit.windowMs) => {
    return (0, express_rate_limit_1.default)({
        windowMs,
        max: (req) => {
            const authenticatedReq = req;
            if (authenticatedReq.user?.plan === "PREMIUM") {
                return config_1.config.rateLimit.maxRequestsPremium;
            }
            return maxRequests;
        },
        message: (req) => {
            const authenticatedReq = req;
            const isPremium = authenticatedReq.user?.plan === "PREMIUM";
            const response = {
                success: false,
                error: `Rate limit exceeded. ${isPremium ? "Premium" : "Free"} users are limited to ${isPremium ? config_1.config.rateLimit.maxRequestsPremium : maxRequests} requests per ${Math.floor(windowMs / 60000)} minutes.`,
            };
            return response;
        },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => {
            const authenticatedReq = req;
            return authenticatedReq.user?.id || req.ip || "anonymous";
        },
        handler: (req, res) => {
            const authenticatedReq = req;
            logger_1.logger.warn("Rate limit exceeded", {
                userId: authenticatedReq.user?.id || "anonymous",
                ip: req.ip,
                userAgent: req.get("User-Agent"),
                endpoint: req.originalUrl,
            });
            const isPremium = authenticatedReq.user?.plan === "PREMIUM";
            const response = {
                success: false,
                error: `Rate limit exceeded. ${isPremium ? "Premium" : "Free"} users are limited to ${isPremium ? config_1.config.rateLimit.maxRequestsPremium : maxRequests} requests per ${Math.floor(windowMs / 60000)} minutes.`,
            };
            res.status(429).json(response);
        },
    });
};
exports.generalRateLimit = createRateLimiter(config_1.config.rateLimit.maxRequestsFree);
exports.authRateLimit = createRateLimiter(5, 15 * 60 * 1000);
exports.summaryRateLimit = createRateLimiter(3, 60 * 1000);
exports.strictRateLimit = createRateLimiter(2, 60 * 1000);
exports.passwordResetRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: {
        success: false,
        error: "Too many password reset attempts. Please try again in an hour.",
    },
    keyGenerator: (req) => req.ip || "anonymous",
    handler: (req, res) => {
        logger_1.logger.warn("Password reset rate limit exceeded", {
            ip: req.ip,
            userAgent: req.get("User-Agent"),
        });
        res.status(429).json({
            success: false,
            error: "Too many password reset attempts. Please try again in an hour.",
        });
    },
});
exports.emailVerificationRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 5 * 60 * 1000,
    max: 3,
    message: {
        success: false,
        error: "Too many email verification attempts. Please try again in 5 minutes.",
    },
    keyGenerator: (req) => req.ip || "anonymous",
});
//# sourceMappingURL=rateLimit.js.map