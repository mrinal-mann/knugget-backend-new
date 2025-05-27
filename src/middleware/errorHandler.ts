import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { config } from "@/config";
import { logger } from "@/config/logger";
import { ApiResponse, ApiError } from "@/types";

export class AppError extends Error implements ApiError {
  public statusCode: number;
  public isOperational: boolean;
  public errors?: any[];

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    errors?: any[]
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle different types of errors
const handlePrismaError = (
  error: Prisma.PrismaClientKnownRequestError
): AppError => {
  switch (error.code) {
    case "P2002":
      const field = (error.meta?.target as string[]) || ["field"];
      return new AppError(`${field[0]} already exists`, 409);

    case "P2025":
      return new AppError("Record not found", 404);

    case "P2003":
      return new AppError("Invalid reference", 400);

    case "P2014":
      return new AppError("Invalid relation", 400);

    default:
      logger.error("Prisma error", { error });
      return new AppError("Database error", 500);
  }
};

const handleValidationError = (error: ZodError): AppError => {
  const errors = error.errors.map((err) => ({
    field: err.path.join("."),
    message: err.message,
  }));

  return new AppError("Validation failed", 400, true, errors);
};

const handleJWTError = (): AppError => {
  return new AppError("Invalid token", 401);
};

const handleTokenExpiredError = (): AppError => {
  return new AppError("Token expired", 401);
};

// Global error handler
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let appError: AppError;

  // Handle different error types
  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    appError = handlePrismaError(error);
  } else if (error instanceof ZodError) {
    appError = handleValidationError(error);
  } else if (error.name === "JsonWebTokenError") {
    appError = handleJWTError();
  } else if (error.name === "TokenExpiredError") {
    appError = handleTokenExpiredError();
  } else {
    // Unhandled error
    logger.error("Unhandled error", {
      error: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    appError = new AppError(
      config.server.nodeEnv === "production"
        ? "Something went wrong"
        : error.message,
      500,
      false
    );
  }

  // Log operational errors in production
  if (appError.isOperational && config.server.nodeEnv === "production") {
    logger.error("Operational error", {
      message: appError.message,
      statusCode: appError.statusCode,
      url: req.originalUrl,
      method: req.method,
    });
  }

  // Send error response
  const response: ApiResponse = {
    success: false,
    error: appError.message,
  };

  // Include additional error details in development
  if (config.server.nodeEnv === "development") {
    response.data = {
      stack: appError.stack,
      errors: appError.errors,
    };
  } else if (appError.errors) {
    response.data = { errors: appError.errors };
  }

  res.status(appError.statusCode).json(response);
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: false,
    error: `Route ${req.originalUrl} not found`,
  };

  res.status(404).json(response);
};

// Async error handler wrapper
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
