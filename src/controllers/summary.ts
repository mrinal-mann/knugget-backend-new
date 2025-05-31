import { Response } from 'express';
import { summaryService } from '../services/summary';
import {
  AuthenticatedRequest,
  ApiResponse,
  GenerateSummaryDto,
  UpdateSummaryDto,
  SummaryQueryParams,
} from '../types';
import { catchAsync } from '../middleware/errorHandler';
import { logger } from '../config/logger';

export class SummaryController {
  // Generate AI summary from transcript
  generate = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      return res.status(401).json(response);
    }

    const { transcript, videoMetadata }: GenerateSummaryDto = req.body;

    const result = await summaryService.generateSummary(req.user.id, {
      transcript,
      videoMetadata,
    });

    const response: ApiResponse = {
      success: true,
      data: result.data,
      message: 'Summary generated successfully',
    };

    logger.info('Summary generated', {
      userId: req.user.id,
      videoId: videoMetadata.videoId,
      summaryId: result.data?.id,
    });

    res.json(response);
  });

  // Save summary
  save = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      return res.status(401).json(response);
    }

    const summaryData = req.body;

    const result = await summaryService.saveSummary(req.user.id, summaryData);

    const response: ApiResponse = {
      success: true,
      data: result.data,
      message: 'Summary saved successfully',
    };

    logger.info('Summary saved', {
      userId: req.user.id,
      summaryId: result.data?.id,
    });

    res.json(response);
  });

  // Get user's summaries with pagination and filtering
  getSummaries = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      return res.status(401).json(response);
    }

    // Safely parse query parameters with defaults
    const queryParams: SummaryQueryParams = {
      page: req.query.page ? Math.max(1, parseInt(req.query.page as string) || 1) : 1,
      limit: req.query.limit ? Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20)) : 20,
      search: req.query.search ? String(req.query.search) : undefined,
      status: req.query.status as any || undefined,
      videoId: req.query.videoId ? String(req.query.videoId) : undefined,
      startDate: req.query.startDate ? String(req.query.startDate) : undefined,
      endDate: req.query.endDate ? String(req.query.endDate) : undefined,
      sortBy: (req.query.sortBy as any) || 'createdAt',
      sortOrder: (req.query.sortOrder as any) || 'desc',
    };

    const result = await summaryService.getSummaries(req.user.id, queryParams);

    const response: ApiResponse = {
      success: true,
      data: result.data,
    };

    res.json(response);
  });

  // Get single summary by ID
  getSummaryById = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      return res.status(401).json(response);
    }

    const { id } = req.params;

    const result = await summaryService.getSummaryById(req.user.id, id);

    const response: ApiResponse = {
      success: true,
      data: result.data,
    };

    res.json(response);
  });

  // Update summary
  updateSummary = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      return res.status(401).json(response);
    }

    const { id } = req.params;
    const updates: UpdateSummaryDto = req.body;

    const result = await summaryService.updateSummary(req.user.id, id, updates);

    const response: ApiResponse = {
      success: true,
      data: result.data,
      message: 'Summary updated successfully',
    };

    logger.info('Summary updated', {
      userId: req.user.id,
      summaryId: id,
      updates: Object.keys(updates),
    });

    res.json(response);
  });

  // Delete summary
  deleteSummary = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      return res.status(401).json(response);
    }

    const { id } = req.params;

    await summaryService.deleteSummary(req.user.id, id);

    const response: ApiResponse = {
      success: true,
      message: 'Summary deleted successfully',
    };

    logger.info('Summary deleted', {
      userId: req.user.id,
      summaryId: id,
    });

    res.json(response);
  });

  // Get summary by video ID
  getSummaryByVideoId = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      return res.status(401).json(response);
    }

    const { videoId } = req.params;

    const result = await summaryService.getSummaryByVideoId(req.user.id, videoId);

    const response: ApiResponse = {
      success: true,
      data: result.data,
    };

    res.json(response);
  });

  // Get summary statistics
  getStats = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      return res.status(401).json(response);
    }

    const result = await summaryService.getSummaryStats(req.user.id);

    const response: ApiResponse = {
      success: true,
      data: result.data,
    };

    res.json(response);
  });
}

export const summaryController = new SummaryController();