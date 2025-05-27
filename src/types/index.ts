import { Request } from "express";
import { User, UserPlan, SummaryStatus } from "@prisma/client";

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Auth Types
export interface AuthUser
  extends Omit<User, "createdAt" | "updatedAt" | "lastLoginAt"> {
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}

export interface JwtPayload {
  userId: string;
  email: string;
  plan: UserPlan;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Request Extensions
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

// Summary Types
export interface TranscriptSegment {
  timestamp: string;
  text: string;
  startSeconds?: number;
  endSeconds?: number;
}

export interface VideoMetadata {
  videoId: string;
  title: string;
  channelName: string;
  duration?: string;
  url: string;
  thumbnailUrl?: string;
  description?: string;
  publishedAt?: string;
  viewCount?: number;
  likeCount?: number;
}

export interface SummaryData {
  id?: string;
  title: string;
  keyPoints: string[];
  fullSummary: string;
  tags: string[];
  status: SummaryStatus;
  videoMetadata: VideoMetadata;
  transcript?: TranscriptSegment[];
  transcriptText?: string;
  createdAt?: string;
  updatedAt?: string;
  saved?: boolean;
}

export interface GenerateSummaryRequest {
  transcript: TranscriptSegment[];
  videoMetadata: VideoMetadata;
}

export interface OpenAISummaryResponse {
  keyPoints: string[];
  fullSummary: string;
  tags: string[];
}

// User Types
export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  plan: UserPlan;
  credits: number;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface UserStats {
  totalSummaries: number;
  summariesThisMonth: number;
  creditsUsed: number;
  creditsRemaining: number;
  planStatus: UserPlan;
  joinedDate: string;
}

// Validation Schemas (DTOs)
export interface RegisterDto {
  email: string;
  password: string;
  name?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
}

export interface VerifyEmailDto {
  token: string;
}

export interface UpdateProfileDto {
  name?: string;
  avatar?: string;
}

export interface GenerateSummaryDto {
  transcript: TranscriptSegment[];
  videoMetadata: VideoMetadata;
}

export interface UpdateSummaryDto {
  title?: string;
  keyPoints?: string[];
  fullSummary?: string;
  tags?: string[];
}

// Error Types
export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  errors?: ValidationError[];
}

// Utility Types
export type CreateUserData = Omit<User, "id" | "createdAt" | "updatedAt">;
export type UpdateUserData = Partial<
  Pick<
    User,
    "name" | "avatar" | "credits" | "plan" | "emailVerified" | "lastLoginAt"
  >
>;

export type CreateSummaryData = {
  title: string;
  keyPoints: string[];
  fullSummary: string;
  tags: string[];
  videoId: string;
  videoTitle: string;
  channelName: string;
  videoDuration?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  transcript?: any;
  transcriptText?: string;
  userId: string;
  status?: SummaryStatus;
};

// Query Parameters
export interface SummaryQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: SummaryStatus;
  videoId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: "createdAt" | "title" | "videoTitle";
  sortOrder?: "asc" | "desc";
}

export interface UserQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  plan?: UserPlan;
  emailVerified?: boolean;
  sortBy?: "createdAt" | "email" | "name";
  sortOrder?: "asc" | "desc";
}

// Service Response Types
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

// Constants
export const MAX_TRANSCRIPT_LENGTH = 50000; // chars
export const MAX_SUMMARY_HISTORY = 100; // per user
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Re-export Prisma types
export {
  User,
  UserPlan,
  SummaryStatus,
  Summary,
  RefreshToken,
  VideoMetadata as PrismaVideoMetadata,
} from "@prisma/client";
