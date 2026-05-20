const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const webhookController = require('../controllers/webhook.controller');

const isMerchant = [authenticate, requireRole(['MERCHANT', 'SUPER_ADMIN'])];

router.post('/endpoints', ...isMerchant, webhookController.create);
router.get('/endpoints', ...isMerchant, webhookController.list);
router.delete('/endpoints/:id', ...isMerchant, webhookController.remove);
router.post('/endpoints/:id/test', ...isMerchant, webhookController.test);
router.get('/deliveries', ...isMerchant, webhookController.deliveries);

module.exports = router;