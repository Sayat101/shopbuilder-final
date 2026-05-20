const abandonedCartService = require('../services/abandonedCart.service');

async function list(req, res, next) {
  try {
    const result = await abandonedCartService.getAbandonedCarts(req.user.tenantId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function recover(req, res, next) {
  try {
    const result = await abandonedCartService.recoverCart(
      req.user.tenantId,
      req.params.cartId
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, recover };