const router = require('express').Router();
const storefrontController = require('../controllers/storefront.controller');

router.get('/', storefrontController.listStores);
router.get('/:subdomain', storefrontController.getStore);
router.get('/:subdomain/products', storefrontController.getProducts);
router.get('/:subdomain/products/:productId', storefrontController.getProduct);

module.exports = router;
