import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import { ApiResponse, ValidationError } from "../types";

// Auth validation schemas
export const registerSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format").min(1, "Email is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password too long"),
    name: z
      .string()
      .min(1, "Name is required")
      .max(100, "Name too long")
      .optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format").min(1, "Email is required"),
    password: z.string().min(1, "Password is required"),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, "Refresh token is required"),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format").min(1, "Email is required"),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Token is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password too long"),
  }),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Token is required"),
  }),
});

// User validation schemas
export const updateProfileSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, "Name cannot be empty")
      .max(100, "Name too long")
      .optional(),
    avatar: z.string().url("Invalid avatar URL").optional(),
  }),
});

// Summary validation schemas
const transcriptSegmentSchema = z.object({
  timestamp: z.string().min(1, "Timestamp is required"),
  text: z.string().min(1, "Text is required"),
  startSeconds: z.number().optional(),
  endSeconds: z.number().optional(),
});

const videoMetadataSchema = z.object({
  videoId: z.string().min(1, "Video ID is required"),
  title: z.string().min(1, "Video title is required"),
  channelName: z.string().min(1, "Channel name is required"),
  duration: z.string().optional(),
  url: z.string().url("Invalid video URL"),
  thumbnailUrl: z.string().url("Invalid thumbnail URL").optional(),
  description: z.string().optional(),
  publishedAt: z.string().optional(),
  viewCount: z.number().optional(),
  likeCount: z.number().optional(),
});

export const generateSummarySchema = z.object({
  body: z.object({
    transcript: z
      .array(transcriptSegmentSchema)
      .min(1, "Transcript segments are required"),
    videoMetadata: videoMetadataSchema,
  }),
});

export const saveSummarySchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required").max(200, "Title too long"),
    keyPoints: z.array(z.string()).min(1, "Key points are required"),
    fullSummary: z
      .string()
      .min(1, "Full summary is required")
      .max(5000, "Summary too long"),
    tags: z.array(z.string()).max(10, "Too many tags"),
    videoMetadata: videoMetadataSchema,
    transcript: z.array(transcriptSegmentSchema).optional(),
    transcriptText: z.string().optional(),
  }),
});

export const updateSummarySchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, "Title cannot be empty")
      .max(200, "Title too long")
      .optional(),
    keyPoints: z.array(z.string()).optional(),
    fullSummary: z
      .string()
      .min(1, "Summary cannot be empty")
      .max(5000, "Summary too long")
      .optional(),
    tags: z.array(z.string()).max(10, "Too many tags").optional(),
  }),
});

// Query parameter validation schemas
export const paginationSchema = z.object({
  query: z.object({
    page: z
      .string()
      .transform(Number)
      .pipe(z.number().int().min(1))
      .default("1"),
    limit: z
      .string()
      .transform(Number)
      .pipe(z.number().int().min(1).max(100))
      .default("20"),
  }),
});

export const summaryQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .transform(Number)
      .pipe(z.number().int().min(1))
      .default("1")
      .optional(),
    limit: z
      .string()
      .transform(Number)
      .pipe(z.number().int().min(1).max(100))
      .default("20")
      .optional(),
    search: z.string().max(100).optional(),
    status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]).optional(),
    videoId: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    sortBy: z
      .enum(["createdAt", "title", "videoTitle"])
      .default("createdAt")
      .optional(),
    sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
  }),
});

// Validation middleware factory
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (!result.success) {
        const errors: ValidationError[] = result.error.errors.map((error) => ({
          field: error.path.join("."),
          message: error.message,
        }));

        const response: ApiResponse = {
          success: false,
          error: "Validation failed",
          data: { errors },
        };

        return res.status(400).json(response);
      }

      // Store validated data in req for later use (don't modify original req properties)
      (req as any).validatedData = result.data;

      next();
    } catch (error) {
      next(error);
    }
  };
};
