import { Router } from 'express';
import crypto from 'crypto';
import Order from '../models/Order.js';
import { protect, httpError } from '../middleware/auth.js';
import { wrap } from '../utils/helpers.js';
const r = Router();
const eq = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const markPaid = async (order, paymentId) => {
  if (order.payment.status === 'paid') return order; // idempotent
  order.payment.status = 'paid'; order.payment.gatewayPaymentId = paymentId;
  order.history.push({ status: order.status, note: 'Payment received' });
  return order.save();
};
r.post('/create-order', protect, wrap(async (req, res) => {
  const KEY_ID = process.env.PAYMENT_GATEWAY_KEY_ID, KEY_SECRET = process.env.PAYMENT_GATEWAY_KEY_SECRET;
  if (!KEY_ID || !KEY_SECRET) throw httpError(503, 'Online payments are not configured');
  const o = await Order.findOne({ _id: req.body.orderId, user: req.user._id, 'payment.method': 'online' });
  if (!o) throw httpError(404, 'Order not found');
  if (o.payment.status === 'paid') throw httpError(400, 'Order already paid');
  const resp = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64') },
    body: JSON.stringify({ amount: o.pricing.total * 100, currency: 'INR', receipt: o.orderNumber }),
  });
  const g = await resp.json();
  if (!resp.ok) throw httpError(502, 'Payment provider error');
  o.payment.gatewayOrderId = g.id; await o.save();
  res.json({ keyId: KEY_ID, gatewayOrderId: g.id, amount: g.amount, currency: g.currency, orderNumber: o.orderNumber });
}));
r.post('/verify', protect, wrap(async (req, res) => {
  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const o = await Order.findOne({ _id: orderId, user: req.user._id });
  if (!o || o.payment.gatewayOrderId !== razorpay_order_id) throw httpError(400, 'Payment does not match this order');
  const expected = crypto.createHmac('sha256', process.env.PAYMENT_GATEWAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
  if (!eq(expected, String(razorpay_signature || ''))) throw httpError(400, 'Payment verification failed');
  res.json(await markPaid(o, razorpay_payment_id));
}));
// Mounted with express.raw in server.js so the signature is checked against the exact body.
export const webhook = wrap(async (req, res) => {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) return res.status(503).end();
  const sig = String(req.headers['x-razorpay-signature'] || '');
  const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
  if (!eq(expected, sig)) return res.status(400).end();
  const ev = JSON.parse(req.body.toString());
  if (ev.event === 'payment.captured') {
    const p = ev.payload.payment.entity;
    const o = await Order.findOne({ 'payment.gatewayOrderId': p.order_id });
    if (o) await markPaid(o, p.id);
  }
  res.json({ ok: true });
});
export default r;
