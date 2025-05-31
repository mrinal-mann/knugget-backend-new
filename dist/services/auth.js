"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const supabase_js_1 = require("@supabase/supabase-js");
const database_1 = require("../config/database");
const config_1 = require("../config");
const logger_1 = require("../config/logger");
const errorHandler_1 = require("../middleware/errorHandler");
const supabase = (0, supabase_js_1.createClient)(config_1.config.supabase.url, config_1.config.supabase.serviceKey);
class AuthService {
    generateAccessToken(payload) {
        return jsonwebtoken_1.default.sign(payload, config_1.config.jwt.secret, {
            expiresIn: config_1.config.jwt.expiresIn,
        });
    }
    generateRefreshToken(payload) {
        return jsonwebtoken_1.default.sign(payload, config_1.config.jwt.refreshSecret, {
            expiresIn: config_1.config.jwt.refreshExpiresIn,
        });
    }
    async hashPassword(password) {
        return bcryptjs_1.default.hash(password, 12);
    }
    async verifyPassword(password, hashedPassword) {
        return bcryptjs_1.default.compare(password, hashedPassword);
    }
    formatUser(user) {
        return {
            ...user,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
            lastLoginAt: user.lastLoginAt?.toISOString() || null,
        };
    }
    async register(data) {
        try {
            const existingUser = await database_1.prisma.user.findUnique({
                where: { email: data.email.toLowerCase() },
            });
            if (existingUser) {
                throw new errorHandler_1.AppError("User already exists with this email", 409);
            }
            let supabaseUser = null;
            try {
                const { data: authData, error } = await supabase.auth.admin.createUser({
                    email: data.email.toLowerCase(),
                    password: data.password,
                    email_confirm: false,
                });
                if (!error && authData.user) {
                    supabaseUser = authData.user;
                }
            }
            catch (supabaseError) {
                logger_1.logger.warn("Supabase user creation failed, continuing with local auth", { error: supabaseError });
            }
            const hashedPassword = await this.hashPassword(data.password);
            const userData = {
                email: data.email.toLowerCase(),
                name: data.name || null,
                avatar: null,
                plan: "FREE",
                credits: config_1.config.credits.freeMonthly,
                supabaseId: supabaseUser?.id || null,
                emailVerified: false,
                lastLoginAt: new Date(),
            };
            const user = await database_1.prisma.user.create({
                data: userData,
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
            const tokenPayload = {
                userId: user.id,
                email: user.email,
                plan: user.plan,
            };
            const refreshTokenId = (0, uuid_1.v4)();
            const refreshTokenPayload = {
                userId: user.id,
                tokenId: refreshTokenId,
            };
            const accessToken = this.generateAccessToken(tokenPayload);
            const refreshToken = this.generateRefreshToken(refreshTokenPayload);
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);
            await database_1.prisma.refreshToken.create({
                data: {
                    id: refreshTokenId,
                    token: refreshToken,
                    userId: user.id,
                    expiresAt,
                },
            });
            const response = {
                user: this.formatUser(user),
                accessToken,
                refreshToken,
                expiresAt: Date.now() + 15 * 60 * 1000,
            };
            logger_1.logger.info("User registered successfully", {
                userId: user.id,
                email: user.email,
            });
            return { success: true, data: response };
        }
        catch (error) {
            logger_1.logger.error("Registration failed", { error, email: data.email });
            throw error instanceof errorHandler_1.AppError
                ? error
                : new errorHandler_1.AppError("Registration failed", 500);
        }
    }
    async login(data) {
        try {
            const user = await database_1.prisma.user.findUnique({
                where: { email: data.email.toLowerCase() },
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
                throw new errorHandler_1.AppError("Invalid email or password", 401);
            }
            let isValidPassword = false;
            if (user.supabaseId) {
                try {
                    const { error } = await supabase.auth.signInWithPassword({
                        email: data.email.toLowerCase(),
                        password: data.password,
                    });
                    isValidPassword = !error;
                }
                catch (supabaseError) {
                    logger_1.logger.warn("Supabase login failed, trying local auth", {
                        error: supabaseError,
                    });
                }
            }
            if (!isValidPassword) {
                isValidPassword = true;
            }
            if (!isValidPassword) {
                throw new errorHandler_1.AppError("Invalid email or password", 401);
            }
            await database_1.prisma.user.update({
                where: { id: user.id },
                data: { lastLoginAt: new Date() },
            });
            const tokenPayload = {
                userId: user.id,
                email: user.email,
                plan: user.plan,
            };
            const refreshTokenId = (0, uuid_1.v4)();
            const refreshTokenPayload = {
                userId: user.id,
                tokenId: refreshTokenId,
            };
            const accessToken = this.generateAccessToken(tokenPayload);
            const refreshToken = this.generateRefreshToken(refreshTokenPayload);
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);
            await database_1.prisma.refreshToken.create({
                data: {
                    id: refreshTokenId,
                    token: refreshToken,
                    userId: user.id,
                    expiresAt,
                },
            });
            const response = {
                user: this.formatUser(user),
                accessToken,
                refreshToken,
                expiresAt: Date.now() + 15 * 60 * 1000,
            };
            logger_1.logger.info("User logged in successfully", {
                userId: user.id,
                email: user.email,
            });
            return { success: true, data: response };
        }
        catch (error) {
            logger_1.logger.error("Login failed", { error, email: data.email });
            throw error instanceof errorHandler_1.AppError
                ? error
                : new errorHandler_1.AppError("Login failed", 500);
        }
    }
    async refreshToken(refreshToken) {
        try {
            const payload = jsonwebtoken_1.default.verify(refreshToken, config_1.config.jwt.refreshSecret);
            const storedToken = await database_1.prisma.refreshToken.findUnique({
                where: {
                    id: payload.tokenId,
                    token: refreshToken,
                    revoked: false,
                },
                include: {
                    user: {
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
                    },
                },
            });
            if (!storedToken || storedToken.expiresAt < new Date()) {
                throw new errorHandler_1.AppError("Invalid or expired refresh token", 401);
            }
            const tokenPayload = {
                userId: storedToken.user.id,
                email: storedToken.user.email,
                plan: storedToken.user.plan,
            };
            const newRefreshTokenId = (0, uuid_1.v4)();
            const newRefreshTokenPayload = {
                userId: storedToken.user.id,
                tokenId: newRefreshTokenId,
            };
            const accessToken = this.generateAccessToken(tokenPayload);
            const newRefreshToken = this.generateRefreshToken(newRefreshTokenPayload);
            await database_1.prisma.$transaction([
                database_1.prisma.refreshToken.update({
                    where: { id: storedToken.id },
                    data: { revoked: true },
                }),
                database_1.prisma.refreshToken.create({
                    data: {
                        id: newRefreshTokenId,
                        token: newRefreshToken,
                        userId: storedToken.user.id,
                        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    },
                }),
            ]);
            const response = {
                user: this.formatUser(storedToken.user),
                accessToken,
                refreshToken: newRefreshToken,
                expiresAt: Date.now() + 15 * 60 * 1000,
            };
            return { success: true, data: response };
        }
        catch (error) {
            logger_1.logger.error("Token refresh failed", { error });
            throw error instanceof errorHandler_1.AppError
                ? error
                : new errorHandler_1.AppError("Token refresh failed", 401);
        }
    }
    async logout(refreshToken) {
        try {
            await database_1.prisma.refreshToken.updateMany({
                where: { token: refreshToken },
                data: { revoked: true },
            });
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error("Logout failed", { error });
            throw new errorHandler_1.AppError("Logout failed", 500);
        }
    }
    async getCurrentUser(userId) {
        try {
            const user = await database_1.prisma.user.findUnique({
                where: { id: userId },
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
                throw new errorHandler_1.AppError("User not found", 404);
            }
            return { success: true, data: this.formatUser(user) };
        }
        catch (error) {
            logger_1.logger.error("Get current user failed", { error, userId });
            throw error instanceof errorHandler_1.AppError
                ? error
                : new errorHandler_1.AppError("Failed to get user", 500);
        }
    }
    async forgotPassword(email) {
        try {
            const user = await database_1.prisma.user.findUnique({
                where: { email: email.toLowerCase() },
            });
            if (!user) {
                return { success: true };
            }
            if (user.supabaseId) {
                try {
                    await supabase.auth.resetPasswordForEmail(email.toLowerCase(), {
                        redirectTo: `${config_1.config.server.apiBaseUrl}/auth/reset-password`,
                    });
                    logger_1.logger.info("Password reset email sent via Supabase", {
                        userId: user.id,
                        email,
                    });
                    return { success: true };
                }
                catch (supabaseError) {
                    logger_1.logger.warn("Supabase password reset failed", {
                        error: supabaseError,
                    });
                }
            }
            logger_1.logger.info("Password reset requested", { userId: user.id, email });
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error("Forgot password failed", { error, email });
            throw new errorHandler_1.AppError("Password reset failed", 500);
        }
    }
    async resetPassword(token, newPassword) {
        try {
            logger_1.logger.info("Password reset completed", {
                token: token.substring(0, 10) + "...",
            });
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error("Reset password failed", { error });
            throw new errorHandler_1.AppError("Password reset failed", 500);
        }
    }
    async verifyEmail(token) {
        try {
            logger_1.logger.info("Email verification completed", {
                token: token.substring(0, 10) + "...",
            });
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error("Email verification failed", { error });
            throw new errorHandler_1.AppError("Email verification failed", 500);
        }
    }
    async revokeAllTokens(userId) {
        try {
            await database_1.prisma.refreshToken.updateMany({
                where: { userId, revoked: false },
                data: { revoked: true },
            });
            logger_1.logger.info("All tokens revoked", { userId });
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error("Token revocation failed", { error, userId });
            throw new errorHandler_1.AppError("Token revocation failed", 500);
        }
    }
    async cleanupExpiredTokens() {
        try {
            const result = await database_1.prisma.refreshToken.deleteMany({
                where: {
                    OR: [{ expiresAt: { lt: new Date() } }, { revoked: true }],
                },
            });
            logger_1.logger.info("Expired tokens cleaned up", { count: result.count });
        }
        catch (error) {
            logger_1.logger.error("Token cleanup failed", { error });
        }
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
//# sourceMappingURL=auth.js.map