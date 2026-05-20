const discountService = require('../services/discount.service');

async function create(req, res, next) {
  try {
    const result = await discountService.createDiscount(req.user.tenantId, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const result = await discountService.listDiscounts(req.user.tenantId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function apply(req, res, next) {
  try {
    const { code, orderAmount } = req.body;
    const result = await discountService.applyDiscount(
      req.user.tenantId,
      code,
      orderAmount
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await discountService.deleteDiscount(
      req.user.tenantId,
      req.params.id
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, apply, remove };