"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = exports.UserService = void 0;
const database_1 = require("../config/database");
const config_1 = require("../config");
const logger_1 = require("../config/logger");
const errorHandler_1 = require("../middleware/errorHandler");
class UserService {
    async getUserProfile(userId) {
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
                    lastLoginAt: true,
                },
            });
            if (!user) {
                throw new errorHandler_1.AppError("User not found", 404);
            }
            const profile = {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
                plan: user.plan,
                credits: user.credits,
                emailVerified: user.emailVerified,
                createdAt: user.createdAt.toISOString(),
                lastLoginAt: user.lastLoginAt?.toISOString() || null,
            };
            return { success: true, data: profile };
        }
        catch (error) {
            logger_1.logger.error("Get user profile failed", {
                error: error instanceof Error ? error.message : "Unknown error",
                userId,
            });
            throw error instanceof errorHandler_1.AppError
                ? error
                : new errorHandler_1.AppError("Failed to get user profile", 500);
        }
    }
    async updateUserProfile(userId, updates) {
        try {
            const user = await database_1.prisma.user.findUnique({
                where: { id: userId },
            });
            if (!user) {
                throw new errorHandler_1.AppError("User not found", 404);
            }
            const updatedUser = await database_1.prisma.user.update({
                where: { id: userId },
                data: {
                    ...(updates.name !== undefined && { name: updates.name }),
                    ...(updates.avatar !== undefined && { avatar: updates.avatar }),
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
                    lastLoginAt: true,
                },
            });
            const profile = {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                avatar: updatedUser.avatar,
                plan: updatedUser.plan,
                credits: updatedUser.credits,
                emailVerified: updatedUser.emailVerified,
                createdAt: updatedUser.createdAt.toISOString(),
                lastLoginAt: updatedUser.lastLoginAt?.toISOString() || null,
            };
            logger_1.logger.info("User profile updated", {
                userId,
                updates: Object.keys(updates),
            });
            return { success: true, data: profile };
        }
        catch (error) {
            logger_1.logger.error("Update user profile failed", {
                error: error instanceof Error ? error.message : "Unknown error",
                userId,
                updates,
            });
            throw error instanceof errorHandler_1.AppError
                ? error
                : new errorHandler_1.AppError("Failed to update user profile", 500);
        }
    }
    async getUserStats(userId) {
        try {
            const user = await database_1.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    plan: true,
                    credits: true,
                    createdAt: true,
                    _count: {
                        select: { summaries: true },
                    },
                },
            });
            if (!user) {
                throw new errorHandler_1.AppError("User not found", 404);
            }
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const summariesThisMonth = await database_1.prisma.summary.count({
                where: {
                    userId,
                    createdAt: { gte: startOfMonth },
                    status: "COMPLETED",
                },
            });
            const maxCredits = user.plan === "PREMIUM"
                ? config_1.config.credits.premiumMonthly
                : config_1.config.credits.freeMonthly;
            const creditsUsed = Math.max(0, maxCredits - user.credits);
            const stats = {
                totalSummaries: user._count.summaries,
                summariesThisMonth,
                creditsUsed,
                creditsRemaining: user.credits,
                planStatus: user.plan,
                joinedDate: user.createdAt.toISOString(),
            };
            return { success: true, data: stats };
        }
        catch (error) {
            logger_1.logger.error("Get user stats failed", {
                error: error instanceof Error ? error.message : "Unknown error",
                userId,
            });
            throw error instanceof errorHandler_1.AppError
                ? error
                : new errorHandler_1.AppError("Failed to get user statistics", 500);
        }
    }
    async addCredits(userId, credits) {
        try {
            if (credits <= 0) {
                throw new errorHandler_1.AppError("Credits must be positive", 400);
            }
            const updatedUser = await database_1.prisma.user.update({
                where: { id: userId },
                data: {
                    credits: { increment: credits },
                },
                select: { credits: true },
            });
            logger_1.logger.info("Credits added to user", {
                userId,
                creditsAdded: credits,
                newBalance: updatedUser.credits,
            });
            return {
                success: true,
                data: { newBalance: updatedUser.credits },
            };
        }
        catch (error) {
            logger_1.logger.error("Add credits failed", {
                error: error instanceof Error ? error.message : "Unknown error",
                userId,
                credits,
            });
            throw error instanceof errorHandler_1.AppError
                ? error
                : new errorHandler_1.AppError("Failed to add credits", 500);
        }
    }
    async deductCredits(userId, credits) {
        try {
            if (credits <= 0) {
                throw new errorHandler_1.AppError("Credits must be positive", 400);
            }
            const user = await database_1.prisma.user.findUnique({
                where: { id: userId },
                select: { credits: true },
            });
            if (!user) {
                throw new errorHandler_1.AppError("User not found", 404);
            }
            if (user.credits < credits) {
                throw new errorHandler_1.AppError("Insufficient credits", 402);
            }
            const updatedUser = await database_1.prisma.user.update({
                where: { id: userId },
                data: {
                    credits: { decrement: credits },
                },
                select: { credits: true },
            });
            logger_1.logger.info("Credits deducted from user", {
                userId,
                creditsDeducted: credits,
                newBalance: updatedUser.credits,
            });
            return {
                success: true,
                data: { newBalance: updatedUser.credits },
            };
        }
        catch (error) {
            logger_1.logger.error("Deduct credits failed", {
                error: error instanceof Error ? error.message : "Unknown error",
                userId,
                credits,
            });
            throw error instanceof errorHandler_1.AppError
                ? error
                : new errorHandler_1.AppError("Failed to deduct credits", 500);
        }
    }
    async upgradePlan(userId, newPlan) {
        try {
            const user = await database_1.prisma.user.findUnique({
                where: { id: userId },
                select: { plan: true },
            });
            if (!user) {
                throw new errorHandler_1.AppError("User not found", 404);
            }
            if (user.plan === newPlan) {
                throw new errorHandler_1.AppError(`User is already on ${newPlan} plan`, 400);
            }
            let creditsToAdd = 0;
            if (newPlan === "PREMIUM" && user.plan === "FREE") {
                creditsToAdd =
                    config_1.config.credits.premiumMonthly - config_1.config.credits.freeMonthly;
            }
            const updatedUser = await database_1.prisma.user.update({
                where: { id: userId },
                data: {
                    plan: newPlan,
                    ...(creditsToAdd > 0 && { credits: { increment: creditsToAdd } }),
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
                    lastLoginAt: true,
                },
            });
            const profile = {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                avatar: updatedUser.avatar,
                plan: updatedUser.plan,
                credits: updatedUser.credits,
                emailVerified: updatedUser.emailVerified,
                createdAt: updatedUser.createdAt.toISOString(),
                lastLoginAt: updatedUser.lastLoginAt?.toISOString() || null,
            };
            logger_1.logger.info("User plan upgraded", {
                userId,
                oldPlan: user.plan,
                newPlan,
                creditsAdded: creditsToAdd,
            });
            return { success: true, data: profile };
        }
        catch (error) {
            logger_1.logger.error("Plan upgrade failed", {
                error: error instanceof Error ? error.message : "Unknown error",
                userId,
                newPlan,
            });
            throw error instanceof errorHandler_1.AppError
                ? error
                : new errorHandler_1.AppError("Failed to upgrade plan", 500);
        }
    }
    async resetMonthlyCredits() {
        try {
            const [freeUsersResult, premiumUsersResult] = await Promise.all([
                database_1.prisma.user.updateMany({
                    where: { plan: "FREE" },
                    data: { credits: config_1.config.credits.freeMonthly },
                }),
                database_1.prisma.user.updateMany({
                    where: { plan: "PREMIUM" },
                    data: { credits: config_1.config.credits.premiumMonthly },
                }),
            ]);
            const totalUpdated = freeUsersResult.count + premiumUsersResult.count;
            logger_1.logger.info("Monthly credits reset", {
                freeUsers: freeUsersResult.count,
                premiumUsers: premiumUsersResult.count,
                totalUsers: totalUpdated,
            });
            return {
                success: true,
                data: { usersUpdated: totalUpdated },
            };
        }
        catch (error) {
            logger_1.logger.error("Monthly credits reset failed", { error });
            throw new errorHandler_1.AppError("Failed to reset monthly credits", 500);
        }
    }
    async deleteUser(userId) {
        try {
            const user = await database_1.prisma.user.findUnique({
                where: { id: userId },
            });
            if (!user) {
                throw new errorHandler_1.AppError("User not found", 404);
            }
            await database_1.prisma.user.delete({
                where: { id: userId },
            });
            logger_1.logger.info("User account deleted", {
                userId,
                email: user.email,
            });
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error("Delete user failed", {
                error: error instanceof Error ? error.message : "Unknown error",
                userId,
            });
            throw error instanceof errorHandler_1.AppError
                ? error
                : new errorHandler_1.AppError("Failed to delete user account", 500);
        }
    }
    async getUserByEmail(email) {
        try {
            const user = await database_1.prisma.user.findUnique({
                where: { email: email.toLowerCase() },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    avatar: true,
                    plan: true,
                    credits: true,
                    emailVerified: true,
                    createdAt: true,
                    lastLoginAt: true,
                },
            });
            if (!user) {
                return { success: true, data: null };
            }
            const profile = {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
                plan: user.plan,
                credits: user.credits,
                emailVerified: user.emailVerified,
                createdAt: user.createdAt.toISOString(),
                lastLoginAt: user.lastLoginAt?.toISOString() || null,
            };
            return { success: true, data: profile };
        }
        catch (error) {
            logger_1.logger.error("Get user by email failed", {
                error: error instanceof Error ? error.message : "Unknown error",
                email,
            });
            throw new errorHandler_1.AppError("Failed to get user", 500);
        }
    }
    async verifyEmail(userId) {
        try {
            await database_1.prisma.user.update({
                where: { id: userId },
                data: { emailVerified: true },
            });
            logger_1.logger.info("User email verified", { userId });
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error("Email verification failed", {
                error: error instanceof Error ? error.message : "Unknown error",
                userId,
            });
            throw error instanceof errorHandler_1.AppError
                ? error
                : new errorHandler_1.AppError("Failed to verify email", 500);
        }
    }
}
exports.UserService = UserService;
exports.userService = new UserService();
//# sourceMappingURL=user.js.map