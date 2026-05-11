const { z } = require('zod');
const paymentService = require('../services/payment.service');
const asyncHandler = require('../utils/asyncHandler');

const checkoutSchema = z.object({
  orderId: z.string(),
  amount: z.number().int().positive(),
  method: z.enum(['MOCK_CARD', 'MOCK_FAIL']),
  idempotencyKey: z.string().min(1),
});

const processCheckout = asyncHandler(async (req, res) => {
  const data = checkoutSchema.parse(req.body);
  const result = await paymentService.processPayment({
    ...data,
    userId: req.user.id,
  });
  res.json(result);
});

module.exports = { processCheckout };
