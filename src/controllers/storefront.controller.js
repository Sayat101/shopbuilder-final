const storefrontService = require('../services/storefront.service');

async function getStore(req, res, next) {
  try {
    const result = await storefrontService.getStorefront(req.params.subdomain);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getProducts(req, res, next) {
  try {
    const result = await storefrontService.getStorefrontProducts(
      req.params.subdomain,
      req.query
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getProduct(req, res, next) {
  try {
    const result = await storefrontService.getStorefrontProduct(
      req.params.subdomain,
      req.params.productId
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { getStore, getProducts, getProduct };