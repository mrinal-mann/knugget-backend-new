import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/config/database";
import { config } from "@/config";
import { AuthenticatedRequest, JwtPayload, ApiResponse } from "@/types";
import { logger } from "@/config/logger";

const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      const response: ApiResponse = {
        success: false,
        error: "Authorization token required",
      };
      return res.status(401).json(response);
    }

    let payload: JwtPayload;
    let user;

    try {
      // First try to verify as our JWT token
      payload = jwt.verify(token, config.jwt.secret) as JwtPayload;

      // Get user from database
      user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          plan: true,
          credits: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          supabaseId: true,
        },
      });
    } catch (jwtError) {
      // If JWT verification fails, try Supabase token verification
      try {
        const { data: supabaseUser, error: supabaseError } =
          await supabase.auth.getUser(token);

        if (supabaseError || !supabaseUser.user) {
          throw new Error("Invalid token");
        }

        // Find or create user based on Supabase user
        user = await prisma.user.findUnique({
          where: { supabaseId: supabaseUser.user.id },
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
            plan: true,
            credits: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            lastLoginAt: true,
            supabaseId: true,
          },
        });

        if (!user && supabaseUser.user.email) {
          // Create user if doesn't exist
          user = await prisma.user.create({
            data: {
              email: supabaseUser.user.email,
              name: supabaseUser.user.user_metadata?.name || null,
              avatar: supabaseUser.user.user_metadata?.avatar_url || null,
              supabaseId: supabaseUser.user.id,
              emailVerified: !!supabaseUser.user.email_confirmed_at,
              lastLoginAt: new Date(),
            },
            select: {
              id: true,
              email: true,
              name: true,
              avatar: true,
              plan: true,
              credits: true,
              emailVerified: true,
              createdAt: true,
              updatedAt: true,
              lastLoginAt: true,
              supabaseId: true,
            },
          });
        }
      } catch (supabaseError) {
        logger.error("Token verification failed", { error: supabaseError });
        const response: ApiResponse = {
          success: false,
          error: "Invalid or expired token",
        };
        return res.status(401).json(response);
      }
    }

    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: "User not found",
      };
      return res.status(401).json(response);
    }

    // Convert dates to strings for JSON serialization
    req.user = {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString(),
    };

    next();
  } catch (error) {
    logger.error("Authentication middleware error", { error });
    const response: ApiResponse = {
      success: false,
      error: "Authentication failed",
    };
    return res.status(401).json(response);
  }
};

export const requirePlan = (requiredPlan: "FREE" | "PREMIUM") => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: "Authentication required",
      };
      return res.status(401).json(response);
    }

    if (requiredPlan === "PREMIUM" && req.user.plan !== "PREMIUM") {
      const response: ApiResponse = {
        success: false,
        error: "Premium plan required",
      };
      return res.status(403).json(response);
    }

    next();
  };
};

export const requireCredits = (requiredCredits: number = 1) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: "Authentication required",
      };
      return res.status(401).json(response);
    }

    if (req.user.credits < requiredCredits) {
      const response: ApiResponse = {
        success: false,
        error: "Insufficient credits",
      };
      return res.status(402).json(response);
    }

    next();
  };
};
