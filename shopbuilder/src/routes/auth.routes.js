const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { rateLimitAuth } = require('../middleware/rateLimiter');

const router = Router();

// Public routes with rate limiting
router.post('/register', rateLimitAuth, authController.register);
router.post('/login', rateLimitAuth, authController.login);
router.post('/refresh', authController.refresh);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

module.exports = router;
