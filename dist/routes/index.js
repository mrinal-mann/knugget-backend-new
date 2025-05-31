"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const openai_1 = require("../services/openai");
const database_1 = require("../config/database");
const logger_1 = require("../config/logger");
const auth_1 = __importDefault(require("./auth"));
const summary_1 = __importDefault(require("./summary"));
const user_1 = __importDefault(require("./user"));
const router = (0, express_1.Router)();
router.get('/health', async (req, res) => {
    try {
        await database_1.prisma.$queryRaw `SELECT 1`;
        const openaiTest = await openai_1.openaiService.testConnection();
        const response = {
            success: true,
            data: {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                services: {
                    database: 'connected',
                    openai: openaiTest.success ? 'connected' : 'disconnected',
                },
                version: '1.0.0',
                uptime: process.uptime(),
            },
        };
        res.json(response);
    }
    catch (error) {
        logger_1.logger.error('Health check failed', { error });
        const response = {
            success: false,
            error: 'Health check failed',
            data: {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                services: {
                    database: 'disconnected',
                    openai: 'unknown',
                },
            },
        };
        res.status(503).json(response);
    }
});
router.get('/', (req, res) => {
    const response = {
        success: true,
        data: {
            name: 'Knugget AI API',
            version: '1.0.0',
            description: 'AI-powered YouTube video summarization API',
            environment: process.env.NODE_ENV,
            endpoints: {
                auth: '/api/auth',
                summary: '/api/summary',
                user: '/api/user',
                health: '/api/health',
            },
            documentation: 'https://docs.knugget.com/api',
        },
    };
    res.json(response);
});
router.use('/auth', auth_1.default);
router.use('/summary', summary_1.default);
router.use('/user', user_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map