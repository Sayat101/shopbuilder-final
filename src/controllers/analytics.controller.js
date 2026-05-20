const analyticsService = require('../services/analytics.service');

async function overview(req, res, next) {
  try {
    const result = await analyticsService.getOverview(req.user.tenantId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function inventory(req, res, next) {
  try {
    const result = await analyticsService.getInventoryAnalytics(req.user.tenantId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function revenueByDay(req, res, next) {
  try {
    const result = await analyticsService.getRevenueByDay(req.user.tenantId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { overview, inventory, revenueByDay };