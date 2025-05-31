import { Router } from 'express';
import { summaryController } from '../controllers/summary';
import { authenticate, requireCredits } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { summaryRateLimit, generalRateLimit } from '../middleware/rateLimit';
import {
  generateSummarySchema,
  saveSummarySchema,
  updateSummarySchema,
} from '../middleware/validation';
import { config } from '../config';

const router = Router();

// All summary routes require authentication
router.use(authenticate as any);

// Generate AI summary from transcript
router.post(
  '/generate',
  summaryRateLimit,
  requireCredits(config.credits.perSummary) as any,
  validate(generateSummarySchema) as any,
  summaryController.generate
);

// Save summary
router.post(
  '/save',
  generalRateLimit,
  validate(saveSummarySchema) as any,
  summaryController.save
);

// Get user's summaries with pagination and filtering (no validation needed for query params)
router.get(
  '/',
  generalRateLimit,
  summaryController.getSummaries
);

// Get summary statistics
router.get(
  '/stats',
  generalRateLimit,
  summaryController.getStats
);

// Get single summary by ID
router.get(
  '/:id',
  generalRateLimit,
  summaryController.getSummaryById
);

// Update summary
router.put(
  "/:id",
  generalRateLimit,
  validate(updateSummarySchema) as any,
  summaryController.updateSummary
);

// Delete summary
router.delete(
  '/:id',
  generalRateLimit,
  summaryController.deleteSummary
);

// Get summary by video ID
router.get(
  '/video/:videoId',
  generalRateLimit,
  summaryController.getSummaryByVideoId
);

export default router;