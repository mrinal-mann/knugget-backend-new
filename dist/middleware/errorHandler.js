"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = exports.catchAsync = exports.notFoundHandler = exports.errorHandler = exports.AppError = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const config_1 = require("../config");
const logger_1 = require("../config/logger");
class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true, errors, code, retryable = false) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.errors = errors;
        this.code = code;
        this.retryable = retryable;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const handlePrismaError = (error) => {
    switch (error.code) {
        case "P2002":
            const field = error.meta?.target || ["field"];
            return new AppError(`${field[0]} already exists`, 409, true, undefined, 'DUPLICATE_ENTRY');
        case "P2025":
            return new AppError("Record not found", 404, true, undefined, 'RECORD_NOT_FOUND');
        case "P2003":
            return new AppError("Invalid reference - referenced record does not exist", 400, true, undefined, 'INVALID_REFERENCE');
        case "P2014":
            return new AppError("Invalid relation", 400, true, undefined, 'INVALID_RELATION');
        case "P2021":
            return new AppError("Table does not exist", 500, false, undefined, 'TABLE_NOT_FOUND');
        case "P2022":
            return new AppError("Column does not exist", 500, false, undefined, 'COLUMN_NOT_FOUND');
        case "P1001":
            return new AppError("Database connection failed", 503, false, undefined, 'DATABASE_CONNECTION_FAILED', true);
        case "P1008":
            return new AppError("Database operation timed out", 504, false, undefined, 'DATABASE_TIMEOUT', true);
        case "P1017":
            return new AppError("Database server has closed the connection", 503, false, undefined, 'DATABASE_CONNECTION_LOST', true);
        default:
            logger_1.logger.error("Unhandled Prisma error", {
                code: error.code,
                message: error.message,
                meta: error.meta
            });
            return new AppError("Database operation failed", 500, false, undefined, 'DATABASE_ERROR', true);
    }
};
const handleValidationError = (error) => {
    const errors = error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
        code: err.code,
        value: 'input' in err ? err.input : undefined
    }));
    return new AppError("Validation failed", 400, true, errors, 'VALIDATION_ERROR');
};
const handleJWTError = (error) => {
    if (error.name === "JsonWebTokenError") {
        return new AppError("Invalid authentication token", 401, true, undefined, 'INVALID_TOKEN');
    }
    if (error.name === "TokenExpiredError") {
        return new AppError("Authentication token has expired", 401, true, undefined, 'TOKEN_EXPIRED');
    }
    if (error.name === "NotBeforeError") {
        return new AppError("Authentication token is not yet valid", 401, true, undefined, 'TOKEN_NOT_ACTIVE');
    }
    return new AppError("Authentication failed", 401, true, undefined, 'AUTH_ERROR');
};
const handleOpenAIError = (error) => {
    if (error.code === 'insufficient_quota') {
        return new AppError("AI service quota exceeded. Please try again later.", 503, true, undefined, 'AI_QUOTA_EXCEEDED', true);
    }
    if (error.code === 'rate_limit_exceeded') {
        return new AppError("AI service rate limit exceeded. Please try again in a moment.", 429, true, undefined, 'AI_RATE_LIMITED', true);
    }
    if (error.code === 'context_length_exceeded') {
        return new AppError("Content too long for AI processing. Please try with shorter content.", 413, true, undefined, 'CONTENT_TOO_LONG');
    }
    if (error.code === 'invalid_request_error') {
        return new AppError("Invalid request to AI service", 400, true, undefined, 'AI_INVALID_REQUEST');
    }
    return new AppError("AI service is currently unavailable. Please try again later.", 503, true, undefined, 'AI_SERVICE_ERROR', true);
};
const handleNetworkError = (error) => {
    if (error.code === 'ECONNREFUSED') {
        return new AppError("Service temporarily unavailable", 503, false, undefined, 'SERVICE_UNAVAILABLE', true);
    }
    if (error.code === 'ENOTFOUND') {
        return new AppError("Service endpoint not found", 503, false, undefined, 'SERVICE_NOT_FOUND', true);
    }
    if (error.code === 'ETIMEDOUT') {
        return new AppError("Request timed out", 504, false, undefined, 'REQUEST_TIMEOUT', true);
    }
    return new AppError("Network error occurred", 503, false, undefined, 'NETWORK_ERROR', true);
};
const handleRateLimitError = (error) => {
    return new AppError(error.message || "Rate limit exceeded", 429, true, undefined, 'RATE_LIMITED', true);
};
const errorHandler = (error, req, res, next) => {
    let appError;
    const requestId = req.headers['x-request-id'] || 'unknown';
    if (error instanceof AppError) {
        appError = error;
    }
    else if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        appError = handlePrismaError(error);
    }
    else if (error instanceof client_1.Prisma.PrismaClientUnknownRequestError) {
        appError = new AppError("Database error occurred", 500, false, undefined, 'DATABASE_UNKNOWN_ERROR', true);
    }
    else if (error instanceof client_1.Prisma.PrismaClientInitializationError) {
        appError = new AppError("Database initialization failed", 500, false, undefined, 'DATABASE_INIT_ERROR', true);
    }
    else if (error instanceof zod_1.ZodError) {
        appError = handleValidationError(error);
    }
    else if (error.name?.includes('JWT') || error.name?.includes('Token')) {
        appError = handleJWTError(error);
    }
    else if (error.message?.includes('OpenAI') || error.code?.startsWith('openai')) {
        appError = handleOpenAIError(error);
    }
    else if (error.code && ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(error.code)) {
        appError = handleNetworkError(error);
    }
    else if (error.message?.includes('rate limit')) {
        appError = handleRateLimitError(error);
    }
    else {
        logger_1.logger.error("Unhandled error", {
            error: error.message,
            stack: error.stack,
            name: error.name,
            code: error.code,
            url: req.originalUrl,
            method: req.method,
            ip: req.ip,
            userAgent: req.get("User-Agent"),
            requestId,
            timestamp: new Date().toISOString(),
            body: req.method !== 'GET' ? req.body : undefined,
            query: req.query,
            params: req.params
        });
        appError = new AppError(config_1.config.server.nodeEnv === "production"
            ? "Internal server error"
            : error.message, 500, false, undefined, 'INTERNAL_ERROR', false);
    }
    if (appError.isOperational) {
        logger_1.logger.warn("Operational error", {
            message: appError.message,
            statusCode: appError.statusCode,
            code: appError.code,
            url: req.originalUrl,
            method: req.method,
            ip: req.ip,
            userAgent: req.get("User-Agent"),
            requestId,
            retryable: appError.retryable,
            timestamp: new Date().toISOString()
        });
    }
    else {
        logger_1.logger.error("System error", {
            message: appError.message,
            statusCode: appError.statusCode,
            code: appError.code,
            stack: appError.stack,
            url: req.originalUrl,
            method: req.method,
            ip: req.ip,
            userAgent: req.get("User-Agent"),
            requestId,
            timestamp: new Date().toISOString()
        });
    }
    const response = {
        success: false,
        error: appError.message,
        code: appError.code,
        retryable: appError.retryable,
        timestamp: new Date().toISOString(),
        requestId: requestId
    };
    if (config_1.config.server.nodeEnv === "development" || appError.statusCode < 500) {
        if (appError.errors) {
            response.data = { errors: appError.errors };
        }
        if (config_1.config.server.nodeEnv === "development") {
            response.stack = appError.stack;
        }
    }
    if (appError.retryable) {
        response.retryAfter = getRetryAfter(appError.statusCode);
        response.maxRetries = 3;
    }
    if (appError.code === 'INSUFFICIENT_CREDITS') {
        response.upgradeUrl = `${config_1.config.server.apiBaseUrl}/upgrade`;
        response.creditsNeeded = 1;
    }
    if (appError.code === 'RATE_LIMITED') {
        res.set('Retry-After', getRetryAfter(429).toString());
    }
    if (req.headers['x-correlation-id']) {
        response.correlationId = req.headers['x-correlation-id'];
    }
    res.status(appError.statusCode).json(response);
};
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res) => {
    const response = {
        success: false,
        error: `Route ${req.originalUrl} not found`,
        code: 'ROUTE_NOT_FOUND',
        timestamp: new Date().toISOString(),
        suggestions: getSuggestions(req.originalUrl)
    };
    logger_1.logger.warn("Route not found", {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString()
    });
    res.status(404).json(response);
};
exports.notFoundHandler = notFoundHandler;
function getRetryAfter(statusCode) {
    switch (statusCode) {
        case 429:
            return 60;
        case 503:
            return 30;
        case 504:
            return 10;
        default:
            return 5;
    }
}
function getSuggestions(url) {
    const suggestions = [];
    const commonEndpoints = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/me',
        '/api/summary/generate',
        '/api/summary',
        '/api/user/profile',
        '/api/health'
    ];
    commonEndpoints.forEach(endpoint => {
        if (levenshteinDistance(url, endpoint) < 3) {
            suggestions.push(endpoint);
        }
    });
    return suggestions.slice(0, 3);
}
function levenshteinDistance(str1, str2) {
    const matrix = [];
    const n = str2.length;
    const m = str1.length;
    if (n === 0)
        return m;
    if (m === 0)
        return n;
    for (let i = 0; i <= m; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= n; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1.charAt(i - 1) === str2.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            }
            else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
            }
        }
    }
    return matrix[m][n];
}
const catchAsync = (fn, timeout = 30000) => {
    return (req, res, next) => {
        const timeoutId = setTimeout(() => {
            next(new AppError("Request timeout", 504, true, undefined, 'REQUEST_TIMEOUT', true));
        }, timeout);
        Promise.resolve(fn(req, res, next))
            .then(() => {
            clearTimeout(timeoutId);
        })
            .catch((error) => {
            clearTimeout(timeoutId);
            next(error);
        });
    };
};
exports.catchAsync = catchAsync;
const healthCheck = (req, res) => {
    const response = {
        success: true,
        data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            errorHandler: 'active',
            version: '1.0.0'
        }
    };
    res.json(response);
};
exports.healthCheck = healthCheck;
//# sourceMappingURL=errorHandler.js.map