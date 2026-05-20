jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'job-123' }),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
  })),
}));

const { queueVerificationEmail, queueOrderConfirmationEmail, emailQueue } =
  require('../../src/workers/email.worker');

describe('Email Queue', () => {
  beforeEach(() => jest.clearAllMocks());

  test('queueVerificationEmail enqueues correct job', async () => {
    await queueVerificationEmail('user@test.kz', 'token-abc');
    expect(emailQueue.add).toHaveBeenCalledWith('send', {
      type: 'verification',
      data: { email: 'user@test.kz', token: 'token-abc' },
    });
  });

  test('queueOrderConfirmationEmail enqueues correct job', async () => {
    const mockOrder = { id: 'order-1', items: [], totalAmount: 5000 };
    await queueOrderConfirmationEmail('buyer@test.kz', mockOrder);
    expect(emailQueue.add).toHaveBeenCalledWith('send', {
      type: 'order-confirmation',
      data: { email: 'buyer@test.kz', order: mockOrder },
    });
  });
});