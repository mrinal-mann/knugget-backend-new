"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const auth_1 = require("../services/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../config/logger");
class AuthController {
    constructor() {
        this.register = (0, errorHandler_1.catchAsync)(async (req, res) => {
            const { email, password, name } = req.body;
            const result = await auth_1.authService.register({ email, password, name });
            const response = {
                success: true,
                data: result.data,
                message: 'User registered successfully',
            };
            logger_1.logger.info('User registration successful', { email, userAgent: req.get('User-Agent') });
            res.status(201).json(response);
        });
        this.login = (0, errorHandler_1.catchAsync)(async (req, res) => {
            const { email, password } = req.body;
            const result = await auth_1.authService.login({ email, password });
            const response = {
                success: true,
                data: result.data,
                message: 'Login successful',
            };
            logger_1.logger.info('User login successful', {
                email,
                userAgent: req.get('User-Agent'),
                origin: req.get('Origin')
            });
            res.json(response);
        });
        this.refresh = (0, errorHandler_1.catchAsync)(async (req, res) => {
            const { refreshToken } = req.body;
            const result = await auth_1.authService.refreshToken(refreshToken);
            const response = {
                success: true,
                data: result.data,
                message: 'Token refreshed successfully',
            };
            res.json(response);
        });
        this.logout = (0, errorHandler_1.catchAsync)(async (req, res) => {
            const { refreshToken } = req.body;
            await auth_1.authService.logout(refreshToken);
            const response = {
                success: true,
                message: 'Logout successful',
            };
            logger_1.logger.info('User logout successful', { userId: req.user?.id });
            res.json(response);
        });
        this.me = (0, errorHandler_1.catchAsync)(async (req, res) => {
            if (!req.user) {
                const response = {
                    success: false,
                    error: 'User not authenticated',
                };
                return res.status(401).json(response);
            }
            const result = await auth_1.authService.getCurrentUser(req.user.id);
            const response = {
                success: true,
                data: result.data,
            };
            res.json(response);
        });
        this.forgotPassword = (0, errorHandler_1.catchAsync)(async (req, res) => {
            const { email } = req.body;
            await auth_1.authService.forgotPassword(email);
            const response = {
                success: true,
                message: 'If an account with this email exists, a password reset link has been sent.',
            };
            logger_1.logger.info('Password reset requested', { email });
            res.json(response);
        });
        this.resetPassword = (0, errorHandler_1.catchAsync)(async (req, res) => {
            const { token, password } = req.body;
            await auth_1.authService.resetPassword(token, password);
            const response = {
                success: true,
                message: 'Password reset successful',
            };
            logger_1.logger.info('Password reset completed');
            res.json(response);
        });
        this.verifyEmail = (0, errorHandler_1.catchAsync)(async (req, res) => {
            const { token } = req.body;
            await auth_1.authService.verifyEmail(token);
            const response = {
                success: true,
                message: 'Email verified successfully',
            };
            logger_1.logger.info('Email verification completed');
            res.json(response);
        });
        this.revokeAllTokens = (0, errorHandler_1.catchAsync)(async (req, res) => {
            if (!req.user) {
                return res.status(401).json({ success: false, error: 'User not authenticated' });
            }
            await auth_1.authService.revokeAllTokens(req.user.id);
            res.json({ success: true, message: 'All tokens revoked successfully' });
        });
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
//# sourceMappingURL=auth.js.map