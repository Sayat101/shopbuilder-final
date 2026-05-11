const { Router } = require('express');
const tenantController = require('../controllers/tenant.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = Router();

// FIXED: MERCHANT can create their own store (was SUPER_ADMIN only — that was a bug)
// SUPER_ADMIN can also create stores on behalf of others
router.post('/', authenticate, requireRole(['MERCHANT', 'SUPER_ADMIN']), tenantController.create);

// MERCHANT can list/view their own tenants; SUPER_ADMIN sees all
router.get('/', authenticate, requireRole(['MERCHANT', 'SUPER_ADMIN']), tenantController.list);
router.get('/:id', authenticate, requireRole(['MERCHANT', 'SUPER_ADMIN']), tenantController.getOne);

module.exports = router;
