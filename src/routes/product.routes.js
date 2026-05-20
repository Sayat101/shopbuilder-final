const { Router } = require('express');
const productController = require('../controllers/product.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = Router();

// Merchant creates products with variant matrix
router.post('/', authenticate, requireRole(['MERCHANT', 'SUPER_ADMIN']), productController.create);

// List products — merchant sees own store
router.get('/', authenticate, productController.list);

// Get single product
router.get('/:id', authenticate, productController.getOne);

// Update product status
router.patch('/:id/status', authenticate, requireRole(['MERCHANT', 'SUPER_ADMIN']), productController.updateStatus);

// Adjust inventory
router.post('/inventory/adjust', authenticate, requireRole(['MERCHANT', 'STAFF', 'SUPER_ADMIN']), productController.adjustInventory);

router.patch('/:id', authenticate, requireRole(['MERCHANT', 'SUPER_ADMIN']), productController.update);
router.delete('/:id', authenticate, requireRole(['MERCHANT', 'SUPER_ADMIN']), productController.archive);
router.get('/:id/variants', authenticate, productController.getVariants);
router.patch('/:id/variants/:variantId', authenticate, requireRole(['MERCHANT', 'SUPER_ADMIN']), productController.updateVariant);
router.get('/locations/all', authenticate, requireRole(['MERCHANT', 'SUPER_ADMIN']), productController.listLocations);

module.exports = router;
