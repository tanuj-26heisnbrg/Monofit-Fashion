import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import { httpError } from '../middleware/auth.js';
import { orderNumber, FREE_SHIPPING_ABOVE, SHIPPING_FEE } from '../utils/helpers.js';

export async function priceCart(rawItems, couponCode, userId) {
  const items = [];
  for (const it of rawItems) {
    const p = await Product.findOne({ _id: it.productId, status: 'published' });
    if (!p) throw httpError(400, 'An item in your cart is no longer available');
    const s = p.sizes.find((x) => x.size === it.size);
    if (!s) throw httpError(400, `Size ${it.size} is not available for ${p.name}`);
    if (s.stock < it.qty) throw httpError(400, `Only ${s.stock} left of ${p.name} (${it.size})`);
    items.push({ product: p._id, name: p.name, sku: p.sku, image: p.images[0]?.url, size: it.size, qty: it.qty, mrp: p.mrp, price: p.price });
  }
  const subtotal = items.reduce((a, i) => a + i.price * i.qty, 0);
  let discount = 0, coupon = null;
  if (couponCode) {
    coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), active: true });
    const now = new Date();
    if (!coupon || (coupon.startsAt && coupon.startsAt > now) || (coupon.expiresAt && coupon.expiresAt < now)) throw httpError(400, 'Coupon is invalid or expired');
    if (subtotal < coupon.minOrder) throw httpError(400, `Coupon needs a minimum order of ₹${coupon.minOrder}`);
    if (coupon.usageLimit && coupon.used >= coupon.usageLimit) throw httpError(400, 'Coupon usage limit reached');
    if (userId && coupon.usedBy.filter((u) => String(u) === String(userId)).length >= coupon.perUserLimit) throw httpError(400, 'You have already used this coupon');
    discount = coupon.type === 'percentage' ? Math.floor((subtotal * coupon.value) / 100) : coupon.value;
    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    discount = Math.min(discount, subtotal);
  }
  const shipping = subtotal - discount >= FREE_SHIPPING_ABOVE ? 0 : SHIPPING_FEE;
  return { items, coupon, pricing: { subtotal, discount, shipping, total: subtotal - discount + shipping } };
}

// Atomic per-size decrement; rolls back if any line fails (prevents overselling).
export async function reserveStock(items) {
  const done = [];
  try {
    for (const i of items) {
      const r = await Product.updateOne(
        { _id: i.product, sizes: { $elemMatch: { size: i.size, stock: { $gte: i.qty } } } },
        { $inc: { 'sizes.$.stock': -i.qty, sold: i.qty } });
      if (r.modifiedCount !== 1) throw httpError(409, `${i.name} (${i.size}) just went out of stock`);
      done.push(i);
    }
  } catch (e) { await restoreStock(done); throw e; }
}
export async function restoreStock(items) {
  for (const i of items) await Product.updateOne({ _id: i.product, 'sizes.size': i.size }, { $inc: { 'sizes.$.stock': i.qty, sold: -i.qty } });
}

export async function createOrder({ user, rawItems, couponCode, address, method, idempotencyKey }) {
  if (idempotencyKey) { const ex = await Order.findOne({ idempotencyKey, user: user._id }); if (ex) return ex; }
  const { items, coupon, pricing } = await priceCart(rawItems, couponCode, user._id);
  await reserveStock(items);
  const order = await Order.create({
    orderNumber: orderNumber(), idempotencyKey, user: user._id, items, address, pricing,
    couponCode: coupon?.code, payment: { method }, history: [{ status: 'placed', note: 'Order placed' }],
  });
  if (coupon) await Coupon.updateOne({ _id: coupon._id }, { $inc: { used: 1 }, $push: { usedBy: user._id } });
  return order;
}

export async function cancelOrder(order, note) {
  if (!order.stockRestored) { await restoreStock(order.items); order.stockRestored = true; }
  order.status = 'cancelled';
  if (order.payment.status === 'paid') order.payment.status = 'refund_pending'; // never mark refunded until confirmed
  order.history.push({ status: 'cancelled', note });
  await order.save();
}
