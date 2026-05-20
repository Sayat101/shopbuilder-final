const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { rateLimitAuth } = require('../middleware/rateLimiter');

const router = Router();

// Public routes
router.post('/register', rateLimitAuth, authController.register);
router.get('/verify-email', authController.verifyEmail);
router.post('/login', rateLimitAuth, authController.login);
router.post('/forgot-password', rateLimitAuth, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/refresh', authController.refresh);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

module.exports = router;
