const { Router } = require('express');
const cartController = require('../controllers/cart.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = Router();

// All cart routes require a logged-in CUSTOMER
router.get('/', authenticate, requireRole('CUSTOMER'), cartController.getCart);
router.post('/items', authenticate, requireRole('CUSTOMER'), cartController.addItem);
router.patch('/items/:variantId', authenticate, requireRole('CUSTOMER'), cartController.updateItem);
router.delete('/items/:variantId', authenticate, requireRole('CUSTOMER'), cartController.removeItem);
router.delete('/', authenticate, requireRole('CUSTOMER'), cartController.clearCart);

module.exports = router;
