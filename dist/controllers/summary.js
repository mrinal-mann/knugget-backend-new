"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.summaryController = exports.SummaryController = void 0;
const summary_1 = require("../services/summary");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../config/logger");
class SummaryController {
    constructor() {
        this.generate = (0, errorHandler_1.catchAsync)(async (req, res) => {
            if (!req.user) {
                const response = {
                    success: false,
                    error: 'User not authenticated',
                };
                return res.status(401).json(response);
            }
            const { transcript, videoMetadata } = req.body;
            const result = await summary_1.summaryService.generateSummary(req.user.id, {
                transcript,
                videoMetadata,
            });
            const response = {
                success: true,
                data: result.data,
                message: 'Summary generated successfully',
            };
            logger_1.logger.info('Summary generated', {
                userId: req.user.id,
                videoId: videoMetadata.videoId,
                summaryId: result.data?.id,
            });
            res.json(response);
        });
        this.save = (0, errorHandler_1.catchAsync)(async (req, res) => {
            if (!req.user) {
                const response = {
                    success: false,
                    error: 'User not authenticated',
                };
                return res.status(401).json(response);
            }
            const summaryData = req.body;
            const result = await summary_1.summaryService.saveSummary(req.user.id, summaryData);
            const response = {
                success: true,
                data: result.data,
                message: 'Summary saved successfully',
            };
            logger_1.logger.info('Summary saved', {
                userId: req.user.id,
                summaryId: result.data?.id,
            });
            res.json(response);
        });
        this.getSummaries = (0, errorHandler_1.catchAsync)(async (req, res) => {
            if (!req.user) {
                const response = {
                    success: false,
                    error: 'User not authenticated',
                };
                return res.status(401).json(response);
            }
            const queryParams = {
                page: req.query.page ? Math.max(1, parseInt(req.query.page) || 1) : 1,
                limit: req.query.limit ? Math.min(100, Math.max(1, parseInt(req.query.limit) || 20)) : 20,
                search: req.query.search ? String(req.query.search) : undefined,
                status: req.query.status || undefined,
                videoId: req.query.videoId ? String(req.query.videoId) : undefined,
                startDate: req.query.startDate ? String(req.query.startDate) : undefined,
                endDate: req.query.endDate ? String(req.query.endDate) : undefined,
                sortBy: req.query.sortBy || 'createdAt',
                sortOrder: req.query.sortOrder || 'desc',
            };
            const result = await summary_1.summaryService.getSummaries(req.user.id, queryParams);
            const response = {
                success: true,
                data: result.data,
            };
            res.json(response);
        });
        this.getSummaryById = (0, errorHandler_1.catchAsync)(async (req, res) => {
            if (!req.user) {
                const response = {
                    success: false,
                    error: 'User not authenticated',
                };
                return res.status(401).json(response);
            }
            const { id } = req.params;
            const result = await summary_1.summaryService.getSummaryById(req.user.id, id);
            const response = {
                success: true,
                data: result.data,
            };
            res.json(response);
        });
        this.updateSummary = (0, errorHandler_1.catchAsync)(async (req, res) => {
            if (!req.user) {
                const response = {
                    success: false,
                    error: 'User not authenticated',
                };
                return res.status(401).json(response);
            }
            const { id } = req.params;
            const updates = req.body;
            const result = await summary_1.summaryService.updateSummary(req.user.id, id, updates);
            const response = {
                success: true,
                data: result.data,
                message: 'Summary updated successfully',
            };
            logger_1.logger.info('Summary updated', {
                userId: req.user.id,
                summaryId: id,
                updates: Object.keys(updates),
            });
            res.json(response);
        });
        this.deleteSummary = (0, errorHandler_1.catchAsync)(async (req, res) => {
            if (!req.user) {
                const response = {
                    success: false,
                    error: 'User not authenticated',
                };
                return res.status(401).json(response);
            }
            const { id } = req.params;
            await summary_1.summaryService.deleteSummary(req.user.id, id);
            const response = {
                success: true,
                message: 'Summary deleted successfully',
            };
            logger_1.logger.info('Summary deleted', {
                userId: req.user.id,
                summaryId: id,
            });
            res.json(response);
        });
        this.getSummaryByVideoId = (0, errorHandler_1.catchAsync)(async (req, res) => {
            if (!req.user) {
                const response = {
                    success: false,
                    error: 'User not authenticated',
                };
                return res.status(401).json(response);
            }
            const { videoId } = req.params;
            const result = await summary_1.summaryService.getSummaryByVideoId(req.user.id, videoId);
            const response = {
                success: true,
                data: result.data,
            };
            res.json(response);
        });
        this.getStats = (0, errorHandler_1.catchAsync)(async (req, res) => {
            if (!req.user) {
                const response = {
                    success: false,
                    error: 'User not authenticated',
                };
                return res.status(401).json(response);
            }
            const result = await summary_1.summaryService.getSummaryStats(req.user.id);
            const response = {
                success: true,
                data: result.data,
            };
            res.json(response);
        });
    }
}
exports.SummaryController = SummaryController;
exports.summaryController = new SummaryController();
//# sourceMappingURL=summary.js.map