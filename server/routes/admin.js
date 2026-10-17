import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import cloudinary from '../config/cloudinary.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Coupon from '../models/Coupon.js';
import Order, { STATUSES } from '../models/Order.js';
import User from '../models/User.js';
import { protect, adminOnly, httpError } from '../middleware/auth.js';
import { wrap, slugify } from '../utils/helpers.js';
import { cancelOrder, restoreStock } from '../services/orderService.js';

const r = Router();
r.use(protect, adminOnly);
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (req, f, cb) => (['image/jpeg', 'image/png', 'image/webp'].includes(f.mimetype) ? cb(null, true) : cb(httpError(400, 'Only JPG, PNG or WEBP images are allowed'))) });

r.post('/uploads', upload.array('images', 8), wrap(async (req, res) => {
  if (!process.env.CLOUDINARY_API_SECRET) throw httpError(503, 'Cloudinary is not configured');
  if (!req.files?.length) throw httpError(400, 'No images received');
  const out = await Promise.all(req.files.map((f) => new Promise((ok, no) =>
    cloudinary.uploader.upload_stream({ folder: 'monofit/products', resource_type: 'image' }, (e, d) => (e ? no(e) : ok({ url: d.secure_url, publicId: d.public_id }))).end(f.buffer))));
  res.status(201).json(out);
}));
r.delete('/uploads', wrap(async (req, res) => {
  if (req.body.publicId) await cloudinary.uploader.destroy(req.body.publicId);
  res.json({ ok: true });
}));

r.get('/dashboard', wrap(async (req, res) => {
  // Sales = paid online orders + delivered COD orders. Cancelled/returned excluded. Refunds are excluded via status, not subtracted.
  const salesMatch = { status: { $nin: ['cancelled', 'returned'] }, $or: [{ 'payment.status': 'paid' }, { 'payment.method': 'cod', status: 'delivered' }] };
  const [products, orders, pending, delivered, sales, lowStock, recent] = await Promise.all([
    Product.countDocuments({ status: { $ne: 'archived' } }), Order.countDocuments(),
    Order.countDocuments({ status: { $in: ['placed', 'confirmed', 'processing', 'packed'] } }), Order.countDocuments({ status: 'delivered' }),
    Order.aggregate([{ $match: salesMatch }, { $group: { _id: null, total: { $sum: '$pricing.total' } } }]),
    Product.find({ status: { $ne: 'archived' }, sizes: { $elemMatch: { stock: { $lte: 5 } } } }).select('name sku sizes').limit(10),
    Order.find().sort('-createdAt').limit(6).select('orderNumber pricing.total status createdAt address.name'),
  ]);
  res.json({ products, orders, pending, delivered, sales: sales[0]?.total || 0, lowStock, recent });
}));

const prod = z.object({
  name: z.string().min(2), description: z.string().optional(), category: z.string(), gender: z.enum(['men', 'women', 'unisex']), sku: z.string().min(2),
  images: z.array(z.object({ url: z.string().url(), publicId: z.string().optional() })).default([]),
  mrp: z.number().positive(), price: z.number().positive(),
  sizes: z.array(z.object({ size: z.string().min(1), stock: z.number().int().min(0) })).min(1),
  colors: z.array(z.string()).default([]), tags: z.array(z.string()).default([]),
  featured: z.boolean().default(false), newArrival: z.boolean().default(false), status: z.enum(['draft', 'published', 'archived']).default('draft'),
});



r.get('/products', wrap(async (req, res) => {
  const f = req.query.q ? { name: new RegExp(esc(req.query.q), 'i') } : {};
  res.json(await Product.find(f).populate('category', 'name').sort('-createdAt').limit(200));
}));


r.post('/products', wrap(async (req, res) => {
  const d = prod.parse(req.body);
  res.status(201).json(await Product.create({ ...d, slug: slugify(d.name) + '-' + Math.random().toString(36).slice(2, 6) }));
}));



r.patch('/products/:id', wrap(async (req, res) => {
  const d = prod.partial().parse(req.body);
  const p = await Product.findById(req.params.id);
  if (!p) throw httpError(404, 'Product not found');
  if (d.images) {
    const keep = new Set(d.images.map((i) => i.publicId));
    for (const old of p.images) if (old.publicId && !keep.has(old.publicId)) cloudinary.uploader.destroy(old.publicId).catch(() => {});
  }
  p.set(d); await p.save(); res.json(p);
}));


r.delete('/products/:id', wrap(async (req, res) => {
  if (await Order.exists({ 'items.product': req.params.id })) {
    await Product.updateOne({ _id: req.params.id }, { status: 'archived' });
    return res.json({ archived: true, message: 'Product has past orders, so it was archived instead of deleted' });
  }
  const p = await Product.findByIdAndDelete(req.params.id);
  for (const i of p?.images || []) if (i.publicId) cloudinary.uploader.destroy(i.publicId).catch(() => {});
  res.json({ deleted: true });
}));

r.get('/orders', wrap(async (req, res) => {
  const f = {}; if (req.query.status) f.status = req.query.status;
  if (req.query.q) f.orderNumber = new RegExp(esc(req.query.q), 'i');
  const page = Math.max(1, +req.query.page || 1);
  const [items, total] = await Promise.all([Order.find(f).sort('-createdAt').skip((page - 1) * 20).limit(20), Order.countDocuments(f)]);
  res.json({ items, total, pages: Math.ceil(total / 20) });
}));
r.get('/orders/:id', wrap(async (req, res) => res.json(await Order.findById(req.params.id).populate('user', 'name email'))));
r.patch('/orders/:id/status', wrap(async (req, res) => {
  const b = z.object({ status: z.enum(STATUSES).optional(), note: z.string().optional(), tracking: z.object({ courier: z.string(), trackingId: z.string(), url: z.string().url().optional() }).optional(), paymentStatus: z.enum(['paid', 'refunded']).optional() }).parse(req.body);
  const o = await Order.findById(req.params.id);
  if (!o) throw httpError(404, 'Order not found');
  if (b.tracking) o.tracking = b.tracking;
  if (b.paymentStatus) { o.payment.status = b.paymentStatus; o.history.push({ status: o.status, note: `Payment marked ${b.paymentStatus}` }); }
  if (b.status && b.status !== o.status) {
    if (o.status === 'cancelled') throw httpError(400, 'Cancelled orders cannot change status');
    if (b.status === 'cancelled') { await cancelOrder(o, b.note || 'Cancelled by admin'); return res.json(o); }
    o.status = b.status; o.history.push({ status: b.status, note: b.note });
    if (b.status === 'delivered' && o.payment.method === 'cod') o.payment.status = 'paid';
    if (b.status === 'returned' && !o.stockRestored) { await restoreStock(o.items); o.stockRestored = true; if (o.payment.status === 'paid') o.payment.status = 'refund_pending'; }
  }
  await o.save(); res.json(o);
}));
r.get('/customers', wrap(async (req, res) => res.json(await User.find({ role: 'customer' }).select('name email phone createdAt').sort('-createdAt').limit(200))));

r.get('/categories', wrap(async (req, res) => res.json(await Category.find().sort('order name'))));
r.post('/categories', wrap(async (req, res) => { const d = z.object({ name: z.string().min(2), order: z.number().optional() }).parse(req.body); res.status(201).json(await Category.create({ ...d, slug: slugify(d.name) })); }));
r.patch('/categories/:id', wrap(async (req, res) => res.json(await Category.findByIdAndUpdate(req.params.id, z.object({ name: z.string().optional(), active: z.boolean().optional(), order: z.number().optional() }).parse(req.body), { new: true }))));
r.get('/coupons', wrap(async (req, res) => res.json(await Coupon.find().sort('-createdAt'))));
r.post('/coupons', wrap(async (req, res) => res.status(201).json(await Coupon.create(req.body))));
r.patch('/coupons/:id', wrap(async (req, res) => res.json(await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }))));
export default r;
