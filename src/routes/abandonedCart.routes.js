const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const abandonedCartController = require('../controllers/abandonedCart.controller');

const isMerchant = [authenticate, requireRole(['MERCHANT', 'SUPER_ADMIN'])];

router.get('/abandoned', ...isMerchant, abandonedCartController.list);
router.post('/abandoned/:cartId/recover', ...isMerchant, abandonedCartController.recover);

module.exports = router;