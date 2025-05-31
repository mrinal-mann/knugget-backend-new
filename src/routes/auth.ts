import { Router } from "express";
import { authController } from "../controllers/auth";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validation";
import {
  authRateLimit,
  passwordResetRateLimit,
  emailVerificationRateLimit,
} from "../middleware/rateLimit";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../middleware/validation";

const router = Router();

// Public routes
router.post(
  "/register",
  authRateLimit,
  validate(registerSchema) as any,
  authController.register
);

router.post(
  "/login",
  authRateLimit,
  validate(loginSchema) as any,
  authController.login
);

router.post(
  "/refresh",
  authRateLimit,
  validate(refreshTokenSchema) as any,
  authController.refresh
);

router.post(
  "/forgot-password",
  passwordResetRateLimit,
  validate(forgotPasswordSchema) as any,
  authController.forgotPassword
);

router.post(
  "/reset-password",
  passwordResetRateLimit,
  validate(resetPasswordSchema) as any,
  authController.resetPassword
);

router.post(
  "/verify-email",
  emailVerificationRateLimit,
  validate(verifyEmailSchema) as any,
  authController.verifyEmail
);

// Protected routes
router.use(authenticate as any);

router.post(
  "/logout",
  validate(refreshTokenSchema) as any,
  authController.logout
);

router.get("/me", authController.me);

router.post("/revoke-all-tokens", authController.revokeAllTokens);

export default router;
