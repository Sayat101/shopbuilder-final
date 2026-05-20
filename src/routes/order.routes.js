const { Router } = require('express');
const orderController = require('../controllers/order.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = Router();

// Customer: place order from cart
router.post('/', authenticate, requireRole('CUSTOMER'), orderController.placeOrder);

// Customer: list their own orders
router.get('/', authenticate, requireRole('CUSTOMER'), orderController.listMyOrders);

// Merchant: list ALL orders for their store (must come before /:id to avoid conflict)
router.get('/all', authenticate, requireRole(['MERCHANT', 'SUPER_ADMIN']), orderController.listTenantOrders);

// Both: get single order (service enforces customer can only see their own)
router.get('/:id', authenticate, orderController.getOrder);

// Merchant: update order status (PENDING→PAID→FULFILLED etc.)
router.patch('/:id/status', authenticate, requireRole(['MERCHANT', 'SUPER_ADMIN']), orderController.updateOrderStatus);

// Customer: cancel their own PENDING order
router.patch('/:id/cancel', authenticate, requireRole('CUSTOMER'), orderController.cancelOrder);

router.post('/:id/refund', authenticate, requireRole('CUSTOMER'), orderController.refundOrder);
router.get('/:id/timeline', authenticate, orderController.getOrderTimeline);

module.exports = router;
