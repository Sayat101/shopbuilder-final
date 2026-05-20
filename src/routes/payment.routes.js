const { Router } = require('express');
const paymentController = require('../controllers/payment.controller');
const { authenticate } = require('../middleware/auth');

const router = Router();

// Process mock payment (requires auth)
router.post('/checkout', authenticate, paymentController.processCheckout);

module.exports = router;
