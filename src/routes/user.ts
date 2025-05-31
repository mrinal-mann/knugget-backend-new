import { Router } from "express";
import { userController } from "../controllers/user";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validation";
import { generalRateLimit, strictRateLimit } from "../middleware/rateLimit";
import { updateProfileSchema } from "../middleware/validation";

const router = Router();

// All user routes require authentication
router.use(authenticate as any);

// Get user profile
router.get("/profile", generalRateLimit, userController.getProfile);

// Update user profile
router.put(
  "/profile",
  generalRateLimit,
  validate(updateProfileSchema) as any,
  userController.updateProfile
);

// Get user statistics
router.get("/stats", generalRateLimit, userController.getStats);

// Add credits (for testing or admin purposes)
router.post("/credits/add", strictRateLimit, userController.addCredits);

// Upgrade user plan
router.post("/plan/upgrade", strictRateLimit, userController.upgradePlan);

// Verify email
router.post("/verify-email", generalRateLimit, userController.verifyEmail);

// Delete user account
router.delete("/account", strictRateLimit, userController.deleteAccount);

export default router;
