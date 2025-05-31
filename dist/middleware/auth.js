"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireCredits = exports.requirePlan = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const supabase_js_1 = require("@supabase/supabase-js");
const database_1 = require("../config/database");
const config_1 = require("../config");
const logger_1 = require("../config/logger");
const supabase = (0, supabase_js_1.createClient)(config_1.config.supabase.url, config_1.config.supabase.serviceKey);
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith("Bearer ")
            ? authHeader.slice(7)
            : null;
        if (!token) {
            const response = {
                success: false,
                error: "Authorization token required",
            };
            return res.status(401).json(response);
        }
        let payload;
        let user;
        try {
            payload = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
            user = await database_1.prisma.user.findUnique({
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
            if (!user) {
                throw new Error("User not found");
            }
        }
        catch (jwtError) {
            try {
                const { data: supabaseUser, error: supabaseError } = await supabase.auth.getUser(token);
                if (supabaseError || !supabaseUser.user) {
                    throw new Error("Invalid token");
                }
                user = await database_1.prisma.user.findUnique({
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
                    user = await database_1.prisma.user.create({
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
                if (!user) {
                    throw new Error("User not found");
                }
            }
            catch (supabaseError) {
                logger_1.logger.error("Token verification failed", {
                    error: supabaseError,
                    hasJWTError: !!jwtError,
                    userAgent: req.get('User-Agent'),
                    origin: req.get('Origin')
                });
                const response = {
                    success: false,
                    error: "Invalid or expired token",
                };
                return res.status(401).json(response);
            }
        }
        req.user = {
            ...user,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
            lastLoginAt: user.lastLoginAt?.toISOString() || null,
        };
        next();
    }
    catch (error) {
        logger_1.logger.error("Authentication middleware error", {
            error,
            userAgent: req.get('User-Agent'),
            origin: req.get('Origin')
        });
        const response = {
            success: false,
            error: "Authentication failed",
        };
        return res.status(401).json(response);
    }
};
exports.authenticate = authenticate;
const requirePlan = (requiredPlan) => {
    return (req, res, next) => {
        if (!req.user) {
            const response = {
                success: false,
                error: "Authentication required",
            };
            return res.status(401).json(response);
        }
        if (requiredPlan === "PREMIUM" && req.user.plan !== "PREMIUM") {
            const response = {
                success: false,
                error: "Premium plan required",
            };
            return res.status(403).json(response);
        }
        next();
    };
};
exports.requirePlan = requirePlan;
const requireCredits = (requiredCredits = 1) => {
    return (req, res, next) => {
        if (!req.user) {
            const response = {
                success: false,
                error: "Authentication required",
            };
            return res.status(401).json(response);
        }
        if (req.user.credits < requiredCredits) {
            const response = {
                success: false,
                error: "Insufficient credits",
            };
            return res.status(402).json(response);
        }
        next();
    };
};
exports.requireCredits = requireCredits;
//# sourceMappingURL=auth.js.map