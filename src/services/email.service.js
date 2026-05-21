const { Resend } = require('resend');
const env = require('../config/env');

const resend = new Resend(env.RESEND_API_KEY);
const FROM = 'ShopBuilder <onboarding@resend.dev>';

async function sendVerificationEmail(email, token) {
  const link = `${env.FRONTEND_URL}?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Verify your ShopBuilder account',
    html: `
      <h2>Welcome to ShopBuilder!</h2>
      <p>Click the link below to verify your email address:</p>
      <a href="${link}" style="background:#000;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
        Verify Email
      </a>
      <p>This link expires in 24 hours.</p>
      <p>If you didn't create an account, ignore this email.</p>
    `,
  });
}

async function sendPasswordResetEmail(email, token) {
  const link = `${env.FRONTEND_URL}?reset_token=${token}`;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Reset your ShopBuilder password',
    html: `
      <h2>Password Reset Request</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${link}" style="background:#000;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
        Reset Password
      </a>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, ignore this email.</p>
    `,
  });
}
async function sendMerchantOrderEmail(email, order) {
  const itemsList = order.items
    .map((i) => `<li>${i.variant.sku} x${i.quantity}</li>`)
    .join('');
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `New Order #${order.id.slice(-8).toUpperCase()} received!`,
    html: `
      <h2>You have a new order!</h2>
      <p>Order ID: <strong>${order.id}</strong></p>
      <ul>${itemsList}</ul>
      <p>Total: <strong>${(order.totalAmount / 100).toFixed(0)} KZT</strong></p>
    `,
  });
}

async function sendOrderConfirmationEmail(email, order) {
  const itemsList = order.items
    .map((i) => `<li>${i.variant.sku} x${i.quantity} — ${(i.price / 100).toFixed(0)} KZT</li>`)
    .join('');

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Order Confirmed #${order.id.slice(-8).toUpperCase()}`,
    html: `
      <h2>Your order is confirmed!</h2>
      <p>Order ID: <strong>${order.id}</strong></p>
      <p>Status: <strong>${order.status}</strong></p>
      <ul>${itemsList}</ul>
      <p>Total: <strong>${(order.totalAmount / 100).toFixed(0)} KZT</strong></p>
      <p>Thank you for shopping with ShopBuilder!</p>
    `,
  });
}

async function sendPaymentReceiptEmail(email, order, payment) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Payment Receipt #${order.id.slice(-8).toUpperCase()}`,
    html: `
      <h2>Payment Successful!</h2>
      <p>Order ID: <strong>${order.id}</strong></p>
      <p>Payment ID: <strong>${payment.id}</strong></p>
      <p>Amount: <strong>${(order.totalAmount / 100).toFixed(0)} KZT</strong></p>
      <p>Method: <strong>${payment.provider}</strong></p>
      <p>Your order is now being processed. Thank you!</p>
    `,
  });
}

async function sendAbandonedCartEmail(email, itemList) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'You left something in your cart!',
    html: `
      <h2>Don't forget your items!</h2>
      <p>You left these items in your cart:</p>
      <p><strong>${itemList}</strong></p>
      <a href="${process.env.APP_URL}" style="background:#000;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
        Complete Purchase
      </a>
    `,
  });
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendPaymentReceiptEmail,
  sendAbandonedCartEmail,
};
