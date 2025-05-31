"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.summaryService = exports.SummaryService = void 0;
const database_1 = require("../config/database");
const config_1 = require("../config");
const logger_1 = require("../config/logger");
const errorHandler_1 = require("../middleware/errorHandler");
const openai_1 = require("./openai");
const types_1 = require("../types");
class SummaryService {
    async generateSummary(userId, data) {
        try {
            const user = await database_1.prisma.user.findUnique({
                where: { id: userId },
                select: { credits: true, plan: true },
            });
            if (!user) {
                throw new errorHandler_1.AppError("User not found", 404);
            }
            if (user.credits < config_1.config.credits.perSummary) {
                throw new errorHandler_1.AppError("Insufficient credits", 402);
            }
            const existingSummary = await database_1.prisma.summary.findFirst({
                where: {
                    userId,
                    videoId: data.videoMetadata.videoId,
                    status: "COMPLETED",
                },
            });
            if (existingSummary) {
                return {
                    success: true,
                    data: this.formatSummary(existingSummary),
                };
            }
            const pendingSummary = await database_1.prisma.summary.create({
                data: {
                    title: data.videoMetadata.title,
                    keyPoints: [],
                    fullSummary: "",
                    tags: [],
                    status: "PROCESSING",
                    videoId: data.videoMetadata.videoId,
                    videoTitle: data.videoMetadata.title,
                    channelName: data.videoMetadata.channelName,
                    videoDuration: data.videoMetadata.duration,
                    videoUrl: data.videoMetadata.url,
                    thumbnailUrl: data.videoMetadata.thumbnailUrl,
                    transcript: data.transcript,
                    transcriptText: this.formatTranscriptText(data.transcript),
                    userId,
                },
            });
            await database_1.prisma.user.update({
                where: { id: userId },
                data: { credits: { decrement: config_1.config.credits.perSummary } },
            });
            try {
                const aiResult = await openai_1.openaiService.generateSummary(data.transcript, data.videoMetadata);
                if (!aiResult.success || !aiResult.data) {
                    throw new errorHandler_1.AppError(aiResult.error || "AI summary generation failed", 500);
                }
                const completedSummary = await database_1.prisma.summary.update({
                    where: { id: pendingSummary.id },
                    data: {
                        keyPoints: aiResult.data.keyPoints,
                        fullSummary: aiResult.data.fullSummary,
                        tags: aiResult.data.tags,
                        status: "COMPLETED",
                    },
                });
                logger_1.logger.info("Summary generated successfully", {
                    userId,
                    summaryId: completedSummary.id,
                    videoId: data.videoMetadata.videoId,
                });
                return {
                    success: true,
                    data: this.formatSummary(completedSummary),
                };
            }
            catch (aiError) {
                await database_1.prisma.$transaction([
                    database_1.prisma.summary.update({
                        where: { id: pendingSummary.id },
                        data: { status: "FAILED" },
                    }),
                    database_1.prisma.user.update({
                        where: { id: userId },
                        data: { credits: { increment: config_1.config.credits.perSummary } },
                    }),
                ]);
                throw aiError;
            }
        }
        catch (error) {
            logger_1.logger.error("Summary generation failed", {
                error: error instanceof Error ? error.message : "Unknown error",
                userId,
                videoId: data.videoMetadata.videoId,
            });
            throw error instanceof errorHandler_1.AppError
                ? error
                : new errorHandler_1.AppError("Summary generation failed", 500);
        }
    }
    async saveSummary(userId, summaryData) {
        try {
            let summary;
            if (summaryData.id) {
                summary = await database_1.prisma.summary.findFirst({
                    where: {
                        id: summaryData.id,
                        userId,
                    },
                });
                if (!summary) {
                    throw new errorHandler_1.AppError("Summary not found", 404);
                }
                summary = await database_1.prisma.summary.update({
                    where: { id: summaryData.id },
                    data: {
                        title: summaryData.title ?? summary.title,
                        keyPoints: summaryData.keyPoints ?? summary.keyPoints,
                        fullSummary: summaryData.fullSummary ?? summary.fullSummary,
                        tags: summaryData.tags ?? summary.tags,
                    },
                });
            }
            else {
                if (!summaryData.videoId ||
                    !summaryData.videoTitle ||
                    !summaryData.channelName) {
                    throw new errorHandler_1.AppError("Missing required video metadata", 400);
                }
                summary = await database_1.prisma.summary.create({
                    data: {
                        title: summaryData.title || summaryData.videoTitle,
                        keyPoints: summaryData.keyPoints || [],
                        fullSummary: summaryData.fullSummary || "",
                        tags: summaryData.tags || [],
                        status: "COMPLETED",
                        videoId: summaryData.videoId,
                        videoTitle: summaryData.videoTitle,
                        channelName: summaryData.channelName,
                        videoDuration: summaryData.videoDuration,
                        videoUrl: summaryData.videoUrl ||
                            `https://youtube.com/watch?v=${summaryData.videoId}`,
                        thumbnailUrl: summaryData.thumbnailUrl,
                        transcript: summaryData.transcript,
                        transcriptText: summaryData.transcriptText,
                        userId,
                    },
                });
            }
            logger_1.logger.info("Summary saved successfully", {
                userId,
                summaryId: summary.id,
                videoId: summary.videoId,
            });
            return {
                success: true,
                data: this.formatSummary(summary),
            };
        }
        catch (error) {
            logger_1.logger.error("Summary save failed", {
                error: error instanceof Error ? error.message : "Unknown error",
                userId,
                summaryId: summaryData.id,
            });
            throw error instanceof errorHandler_1.AppError
                ? error
                : new errorHandler_1.AppError("Failed to save summary", 500);
        }
    }
    async getSummaries(userId, params = {}) {
        try {
            const { page = 1, limit = 20, search, status, videoId, startDate, endDate, sortBy = "createdAt", sortOrder = "desc", } = params;
            const where = {
                userId,
                ...(status && { status }),
                ...(videoId && { videoId }),
                ...(startDate &&
                    endDate && {
                    createdAt: {
                        gte: new Date(startDate),
                        lte: new Date(endDate),
                    },
                }),
                ...(search && {
                    OR: [
                        { title: { contains: search, mode: "insensitive" } },
                        { videoTitle: { contains: search, mode: "insensitive" } },
                        { channelName: { contains: search, mode: "insensitive" } },
                        { fullSummary: { contains: search, mode: "insensitive" } },
                    ],
                }),
            };
            const total = await database_1.prisma.summary.count({ where });
            const summaries = await database_1.prisma.summary.findMany({
                where,
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            });
            const totalPages = Math.ceil(total / limit);
            const response = {
                data: summaries.map((summary) => this.formatSummary(summary)),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                },
            };
            return { success: true, data: response };
        }
        catch (error) {
            logger_1.logger.error("Get summaries failed", {
                error: error instanceof Error ? error.message : "Unknown error",
                userId,
                params,
            });
            throw new errorHandler_1.AppError("Failed to get summaries", 500);
        }
    }
    async getSummaryById(userId, summaryId) {
        try {
            const summary = await database_1.prisma.summary.findFirst({
                where: {
                    id: summaryId,
                    userId,
                },
            });
            if (!summary) {
                throw new errorHandler_1.AppError("Summary not found", 404);
            }
            return {
                success: true,
                data: this.formatSummary(summary),
            };
        }
        catch (error) {
            logger_1.logger.error("Get summary by ID failed", {
                error: error instanceof Error ? error.message : "Unknown error",
                userId,
                summaryId,
            });
            throw error instanceof errorHandler_1.AppError
                ? error
                : new errorHandler_1.AppError("Failed to get summary", 500);
        }
    }
    async updateSummary(userId, summaryId, updates) {
        try {
            const existingSummary = await database_1.prisma.summary.findFirst({
                where: {
                    id: summaryId,
                    userId,
                },
            });
            if (!existingSummary) {
                throw new errorHandler_1.AppError("Summary not found", 404);
            }
            const updatedSummary = await database_1.prisma.summary.update({
                where: { id: summaryId },
                data: updates,
            });
            logger_1.logger.info("Summary updated successfully", {
                userId,
                summaryId,
                updates: Object.keys(updates),
            });
            return {
                success: true,
                data: this.formatSummary(updatedSummary),
            };
        }
        catch (error) {
            logger_1.logger.error("Summary update failed", {
                error: error instanceof Error ? error.message : "Unknown error",
                userId,
                summaryId,
            });
            throw error instanceof errorHandler_1.AppError
                ? error
                : new errorHandler_1.AppError("Failed to update summary", 500);
        }
    }
    async deleteSummary(userId, summaryId) {
        try {
            const summary = await database_1.prisma.summary.findFirst({
                where: {
                    id: summaryId,
                    userId,
                },
            });
            if (!summary) {
                throw new errorHandler_1.AppError("Summary not found", 404);
            }
            await database_1.prisma.summary.delete({
                where: { id: summaryId },
            });
            logger_1.logger.info("Summary deleted successfully", {
                userId,
                summaryId,
                videoId: summary.videoId,
            });
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error("Summary deletion failed", {
                error: error instanceof Error ? error.message : "Unknown error",
                userId,
                summaryId,
            });
            throw error instanceof errorHandler_1.AppError
                ? error
                : new errorHandler_1.AppError("Failed to delete summary", 500);
        }
    }
    async getSummaryByVideoId(userId, videoId) {
        try {
            const summary = await database_1.prisma.summary.findFirst({
                where: {
                    userId,
                    videoId,
                    status: "COMPLETED",
                },
                orderBy: { createdAt: "desc" },
            });
            return {
                success: true,
                data: summary ? this.formatSummary(summary) : null,
            };
        }
        catch (error) {
            logger_1.logger.error("Get summary by video ID failed", {
                error: error instanceof Error ? error.message : "Unknown error",
                userId,
                videoId,
            });
            throw new errorHandler_1.AppError("Failed to get summary", 500);
        }
    }
    async cleanupOldSummaries() {
        try {
            const usersWithManySummaries = await database_1.prisma.user.findMany({
                where: {
                    summaries: {
                        some: {},
                    },
                },
                select: {
                    id: true,
                    _count: {
                        select: { summaries: true },
                    },
                },
            });
            for (const user of usersWithManySummaries) {
                if (user._count.summaries > types_1.MAX_SUMMARY_HISTORY) {
                    const summariesToDelete = await database_1.prisma.summary.findMany({
                        where: { userId: user.id },
                        orderBy: { createdAt: "asc" },
                        take: user._count.summaries - types_1.MAX_SUMMARY_HISTORY,
                        select: { id: true },
                    });
                    if (summariesToDelete.length > 0) {
                        await database_1.prisma.summary.deleteMany({
                            where: {
                                id: { in: summariesToDelete.map((s) => s.id) },
                            },
                        });
                        logger_1.logger.info("Old summaries cleaned up", {
                            userId: user.id,
                            deletedCount: summariesToDelete.length,
                        });
                    }
                }
            }
        }
        catch (error) {
            logger_1.logger.error("Summary cleanup failed", { error });
        }
    }
    formatSummary(summary) {
        return {
            id: summary.id,
            title: summary.title,
            keyPoints: summary.keyPoints,
            fullSummary: summary.fullSummary,
            tags: summary.tags,
            status: summary.status,
            videoMetadata: {
                videoId: summary.videoId,
                title: summary.videoTitle,
                channelName: summary.channelName,
                duration: summary.videoDuration,
                url: summary.videoUrl,
                thumbnailUrl: summary.thumbnailUrl,
            },
            transcript: summary.transcript,
            transcriptText: summary.transcriptText,
            createdAt: summary.createdAt.toISOString(),
            updatedAt: summary.updatedAt.toISOString(),
            saved: true,
        };
    }
    formatTranscriptText(transcript) {
        return transcript.map((segment) => segment.text).join(" ");
    }
    async getSummaryStats(userId) {
        try {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const [totalSummaries, summariesThisMonth, completedSummaries, failedSummaries, completedSummariesForAvg,] = await Promise.all([
                database_1.prisma.summary.count({
                    where: { userId },
                }),
                database_1.prisma.summary.count({
                    where: {
                        userId,
                        createdAt: { gte: startOfMonth },
                    },
                }),
                database_1.prisma.summary.count({
                    where: {
                        userId,
                        status: "COMPLETED",
                    },
                }),
                database_1.prisma.summary.count({
                    where: {
                        userId,
                        status: "FAILED",
                    },
                }),
                database_1.prisma.summary.findMany({
                    where: {
                        userId,
                        status: "COMPLETED",
                    },
                    select: {
                        fullSummary: true,
                    },
                }),
            ]);
            const averageSummaryLength = completedSummariesForAvg.length > 0
                ? Math.round(completedSummariesForAvg.reduce((sum, s) => sum + s.fullSummary.length, 0) / completedSummariesForAvg.length)
                : 0;
            return {
                success: true,
                data: {
                    totalSummaries,
                    summariesThisMonth,
                    completedSummaries,
                    failedSummaries,
                    averageSummaryLength,
                },
            };
        }
        catch (error) {
            logger_1.logger.error("Get summary stats failed", {
                error: error instanceof Error ? error.message : "Unknown error",
                userId,
            });
            throw new errorHandler_1.AppError("Failed to get summary statistics", 500);
        }
    }
}
exports.SummaryService = SummaryService;
exports.summaryService = new SummaryService();
//# sourceMappingURL=summary.js.map