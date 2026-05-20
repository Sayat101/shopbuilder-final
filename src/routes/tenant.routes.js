const { Router } = require('express');
const tenantController = require('../controllers/tenant.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = Router();

// Only SUPER_ADMIN can manually create/manage tenants
// Merchants get their tenant auto-created during registration
router.post('/', authenticate, requireRole(['SUPER_ADMIN']), tenantController.create);

// MERCHANT can view their own tenant; SUPER_ADMIN sees all
router.get('/', authenticate, requireRole(['MERCHANT', 'SUPER_ADMIN']), tenantController.list);
router.get('/:id', authenticate, requireRole(['MERCHANT', 'SUPER_ADMIN']), tenantController.getOne);

module.exports = router;
