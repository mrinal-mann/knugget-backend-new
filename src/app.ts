import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config/index";
import { logger } from "./config/logger";
import { prisma } from "./config/database";
import routes from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { authService } from "./services/auth";
import { summaryService } from "./services/summary";

const app = express();

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "https://api.openai.com"],
      },
    },
  })
);

// FIXED: Enhanced CORS configuration for extension support
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        "http://localhost:8000",
        "https://knugget-client.vercel.app",
        "chrome-extension://",
        "https://knugget-backend.onrender.com",
      ];

      // Check if origin is in allowed list or is chrome-extension
      if (
        allowedOrigins.some(
          (allowedOrigin) =>
            origin.startsWith(allowedOrigin) ||
            (allowedOrigin === "chrome-extension://" &&
              origin.startsWith("chrome-extension://"))
        )
      ) {
        return callback(null, true);
      }

      // Log unauthorized origin attempts
      logger.warn('CORS blocked origin:', { origin });

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    maxAge: 86400, // 24 hours
  })
);

// Request parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging middleware
app.use(
  morgan("combined", {
    stream: {
      write: (message: string) => {
        logger.info(message.trim());
      },
    },
    skip: (req) => {
      // Skip logging for health checks in production
      return config.server.nodeEnv === 'production' && req.url === '/api/health';
    }
  })
);

// API routes
app.use("/api", routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown`);

  try {
    await prisma.$disconnect();
    logger.info("Database connection closed");
    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown", { error });
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Cleanup tasks (run periodically)
const runCleanupTasks = async () => {
  try {
    logger.info("Running cleanup tasks");
    await authService.cleanupExpiredTokens();
    await summaryService.cleanupOldSummaries();
    logger.info("Cleanup tasks completed");
  } catch (error) {
    logger.error("Cleanup tasks failed", { error });
  }
};

// Run cleanup tasks every 24 hours in production
if (config.server.nodeEnv === "production") {
  setInterval(runCleanupTasks, 24 * 60 * 60 * 1000);
}

// Start server
const startServer = async () => {
  try {
    await prisma.$connect();
    logger.info("Database connected successfully");

    const server = app.listen(process.env.PORT, () => {
      logger.info(`🚀 Knugget API server running on port ${process.env.PORT}`);
      logger.info(`📡 Environment: ${config.server.nodeEnv}`);
      logger.info(`🔗 API Base URL: ${config.server.apiBaseUrl}`);
      logger.info(`🌐 CORS Origins: ${config.cors.allowedOrigins.join(', ')}`);
    });

    server.on("error", (error: NodeJS.ErrnoException) => {
      if (error.syscall !== "listen") {
        throw error;
      }

      const bind = `Port ${process.env.PORT}`;

      switch (error.code) {
        case "EACCES":
          logger.error(`${bind} requires elevated privileges`);
          process.exit(1);
          break;
        case "EADDRINUSE":
          logger.error(`${bind} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });

    return server;
  } catch (error) {
    logger.error("Failed to start server", { error });
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

export default app;