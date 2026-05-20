const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const discountController = require('../controllers/discount.controller');

// MERCHANT создаёт и управляет промокодами
router.post('/', authenticate, requireRole(['MERCHANT', 'SUPER_ADMIN']), discountController.create);
router.get('/', authenticate, requireRole(['MERCHANT', 'SUPER_ADMIN']), discountController.list);
router.delete('/:id', authenticate, requireRole(['MERCHANT', 'SUPER_ADMIN']), discountController.remove);
router.post('/apply', authenticate, requireRole('CUSTOMER'), discountController.apply);

module.exports = router;