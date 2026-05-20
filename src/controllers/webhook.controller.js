const webhookService = require('../services/webhook.service');

async function create(req, res, next) {
  try {
    const result = await webhookService.createEndpoint(req.user.tenantId, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const result = await webhookService.listEndpoints(req.user.tenantId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function deliveries(req, res, next) {
  try {
    const result = await webhookService.listDeliveries(req.user.tenantId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function test(req, res, next) {
  try {
    const result = await webhookService.testEndpoint(req.user.tenantId, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await webhookService.deleteEndpoint(req.user.tenantId, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, deliveries, test, remove };