import { Router } from 'express';
import { ApiResponse } from '@/types';
import { openaiService } from '@/services/openai';
import { logger } from '@/config/logger';
import authRoutes from './auth';
import summaryRoutes from './summary';
import userRoutes from './user';

const router = Router();

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Test OpenAI connection
    const openaiTest = await openaiService.testConnection();
    
    const response: ApiResponse = {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
          openai: openaiTest.success ? 'connected' : 'disconnected',
        },
      },
    };

    res.json(response);
  } catch (error) {
    logger.error('Health check failed', { error });
    
    const response: ApiResponse = {
      success: false,
      error: 'Health check failed',
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      },
    };

    res.status(503).json(response);
  }
});

// API information endpoint
router.get('/', (req, res) => {
  const response: ApiResponse = {
    success: true,
    data: {
      name: 'Knugget AI API',
      version: '1.0.0',
      description: 'AI-powered YouTube video summarization API',
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

// Mount route modules
router.use('/auth', authRoutes);
router.use('/summary', summaryRoutes);
router.use('/user', userRoutes);

export default router;