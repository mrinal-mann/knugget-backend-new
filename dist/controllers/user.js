"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userController = exports.UserController = void 0;
const user_1 = require("../services/user");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../config/logger");
class UserController {
    constructor() {
        this.getProfile = (0, errorHandler_1.catchAsync)(async (req, res) => {
            if (!req.user) {
                const response = {
                    success: false,
                    error: 'User not authenticated',
                };
                return res.status(401).json(response);
            }
            const result = await user_1.userService.getUserProfile(req.user.id);
            const response = {
                success: true,
                data: result.data,
            };
            res.json(response);
        });
        this.updateProfile = (0, errorHandler_1.catchAsync)(async (req, res) => {
            if (!req.user) {
                const response = {
                    success: false,
                    error: 'User not authenticated',
                };
                return res.status(401).json(response);
            }
            const updates = req.body;
            const result = await user_1.userService.updateUserProfile(req.user.id, updates);
            const response = {
                success: true,
                data: result.data,
                message: 'Profile updated successfully',
            };
            logger_1.logger.info('User profile updated', {
                userId: req.user.id,
                updates: Object.keys(updates),
            });
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
            const result = await user_1.userService.getUserStats(req.user.id);
            const response = {
                success: true,
                data: result.data,
            };
            res.json(response);
        });
        this.addCredits = (0, errorHandler_1.catchAsync)(async (req, res) => {
            if (!req.user) {
                const response = {
                    success: false,
                    error: 'User not authenticated',
                };
                return res.status(401).json(response);
            }
            const { credits } = req.body;
            if (!credits || credits <= 0) {
                const response = {
                    success: false,
                    error: 'Invalid credits amount',
                };
                return res.status(400).json(response);
            }
            const result = await user_1.userService.addCredits(req.user.id, credits);
            const response = {
                success: true,
                data: result.data,
                message: `${credits} credits added successfully`,
            };
            logger_1.logger.info('Credits added to user', {
                userId: req.user.id,
                creditsAdded: credits,
                newBalance: result.data?.newBalance,
            });
            res.json(response);
        });
        this.upgradePlan = (0, errorHandler_1.catchAsync)(async (req, res) => {
            if (!req.user) {
                const response = {
                    success: false,
                    error: 'User not authenticated',
                };
                return res.status(401).json(response);
            }
            const { plan } = req.body;
            if (!plan || !['FREE', 'PREMIUM'].includes(plan)) {
                const response = {
                    success: false,
                    error: 'Invalid plan type',
                };
                return res.status(400).json(response);
            }
            const result = await user_1.userService.upgradePlan(req.user.id, plan);
            const response = {
                success: true,
                data: result.data,
                message: `Plan upgraded to ${plan} successfully`,
            };
            logger_1.logger.info('User plan upgraded', {
                userId: req.user.id,
                newPlan: plan,
            });
            res.json(response);
        });
        this.deleteAccount = (0, errorHandler_1.catchAsync)(async (req, res) => {
            if (!req.user) {
                const response = {
                    success: false,
                    error: 'User not authenticated',
                };
                return res.status(401).json(response);
            }
            await user_1.userService.deleteUser(req.user.id);
            const response = {
                success: true,
                message: 'Account deleted successfully',
            };
            logger_1.logger.info('User account deleted', {
                userId: req.user.id,
                email: req.user.email,
            });
            res.json(response);
        });
        this.verifyEmail = (0, errorHandler_1.catchAsync)(async (req, res) => {
            if (!req.user) {
                const response = {
                    success: false,
                    error: 'User not authenticated',
                };
                return res.status(401).json(response);
            }
            await user_1.userService.verifyEmail(req.user.id);
            const response = {
                success: true,
                message: 'Email verified successfully',
            };
            logger_1.logger.info('User email verified', {
                userId: req.user.id,
            });
            res.json(response);
        });
    }
}
exports.UserController = UserController;
exports.userController = new UserController();
//# sourceMappingURL=user.js.map