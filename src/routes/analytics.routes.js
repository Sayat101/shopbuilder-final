const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const analyticsController = require('../controllers/analytics.controller');

const isMerchant = [authenticate, requireRole(['MERCHANT', 'SUPER_ADMIN'])];

router.get('/overview', ...isMerchant, analyticsController.overview);
router.get('/inventory', ...isMerchant, analyticsController.inventory);
router.get('/revenue', ...isMerchant, analyticsController.revenueByDay);

module.exports = router;