"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const index_1 = require("./config/index");
const logger_1 = require("./config/logger");
const database_1 = require("./config/database");
const routes_1 = __importDefault(require("./routes"));
const errorHandler_1 = require("./middleware/errorHandler");
const auth_1 = require("./services/auth");
const summary_1 = require("./services/summary");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", "https://api.openai.com"],
        },
    },
}));
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (index_1.config.cors.allowedOrigins.some((allowedOrigin) => origin.startsWith(allowedOrigin) ||
            (allowedOrigin === "chrome-extension://" &&
                origin.startsWith("chrome-extension://")))) {
            return callback(null, true);
        }
        if (index_1.config.server.nodeEnv === 'development') {
            logger_1.logger.warn('CORS blocked origin:', { origin });
        }
        callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    optionsSuccessStatus: 200,
}));
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
app.use((0, morgan_1.default)("combined", {
    stream: {
        write: (message) => {
            logger_1.logger.info(message.trim());
        },
    },
    skip: (req) => {
        return index_1.config.server.nodeEnv === 'production' && req.url === '/api/health';
    }
}));
app.use("/api", routes_1.default);
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
const gracefulShutdown = async (signal) => {
    logger_1.logger.info(`Received ${signal}, starting graceful shutdown`);
    try {
        await database_1.prisma.$disconnect();
        logger_1.logger.info("Database connection closed");
        process.exit(0);
    }
    catch (error) {
        logger_1.logger.error("Error during graceful shutdown", { error });
        process.exit(1);
    }
};
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
const runCleanupTasks = async () => {
    try {
        logger_1.logger.info("Running cleanup tasks");
        await auth_1.authService.cleanupExpiredTokens();
        await summary_1.summaryService.cleanupOldSummaries();
        logger_1.logger.info("Cleanup tasks completed");
    }
    catch (error) {
        logger_1.logger.error("Cleanup tasks failed", { error });
    }
};
if (index_1.config.server.nodeEnv === "production") {
    setInterval(runCleanupTasks, 24 * 60 * 60 * 1000);
}
const startServer = async () => {
    try {
        await database_1.prisma.$connect();
        logger_1.logger.info("Database connected successfully");
        const server = app.listen(process.env.PORT, () => {
            logger_1.logger.info(`🚀 Knugget API server running on port ${process.env.PORT}`);
            logger_1.logger.info(`📡 Environment: ${index_1.config.server.nodeEnv}`);
            logger_1.logger.info(`🔗 API Base URL: ${index_1.config.server.apiBaseUrl}`);
            logger_1.logger.info(`🌐 CORS Origins: ${index_1.config.cors.allowedOrigins.join(', ')}`);
        });
        server.on("error", (error) => {
            if (error.syscall !== "listen") {
                throw error;
            }
            const bind = `Port ${process.env.PORT}`;
            switch (error.code) {
                case "EACCES":
                    logger_1.logger.error(`${bind} requires elevated privileges`);
                    process.exit(1);
                    break;
                case "EADDRINUSE":
                    logger_1.logger.error(`${bind} is already in use`);
                    process.exit(1);
                    break;
                default:
                    throw error;
            }
        });
        return server;
    }
    catch (error) {
        logger_1.logger.error("Failed to start server", { error });
        process.exit(1);
    }
};
if (require.main === module) {
    startServer();
}
exports.default = app;
//# sourceMappingURL=app.js.map