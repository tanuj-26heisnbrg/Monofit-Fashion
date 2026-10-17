import { Router } from "express";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import { wrap } from "../utils/helpers.js";
import { httpError } from "../middleware/auth.js";
const r = Router();
r.get(
  "/categories",
  wrap(async (req, res) =>
    res.json(await Category.find({ active: true }).sort("order name")),
  ),
);
r.get(
  "/products/featured",
  wrap(async (req, res) => {
    const base = { status: "published" };
    const pop = (q) => q.populate("category", "name slug").limit(8);
    const [featured, newArrivals, bestSellers, sale] = await Promise.all([
      pop(Product.find({ ...base, featured: true })),
      pop(Product.find({ ...base, newArrival: true }).sort("-createdAt")),
      pop(Product.find(base).sort("-sold")),
      pop(
        Product.find({ ...base, discountPct: { $gte: 20 } }).sort(
          "-discountPct",
        ),
      ),
    ]);
    res.json({ featured, newArrivals, bestSellers, sale });
  }),
);
r.get(
  "/products",
  wrap(async (req, res) => {
    const {
      q,
      category,
      gender,
      size,
      minPrice,
      maxPrice,
      minDiscount,
      sort,
      tag,
    } = req.query;
    const page = Math.max(1, +req.query.page || 1),
      limit = Math.min(48, +req.query.limit || 12);
    const f = { status: "published" };
    if (q) f.$text = { $search: String(q) };
    if (category) {
      const c = await Category.findOne({ slug: String(category) });
      f.category = c?._id || null;
    }
    if (gender) f.gender = { $in: [String(gender), "unisex"] };
    if (size) f["sizes.size"] = String(size);
    if (tag) f.tags = String(tag);
    if (minPrice || maxPrice)
      f.price = {
        ...(minPrice && { $gte: +minPrice }),
        ...(maxPrice && { $lte: +maxPrice }),
      };
    if (minDiscount) f.discountPct = { $gte: +minDiscount };
    if (req.query.new) f.newArrival = true;
    const sorts = {
      price_asc: "price",
      price_desc: "-price",
      new: "-createdAt",
      best: "-sold",
    };
    const [items, total] = await Promise.all([
      Product.find(f)
        .populate("category", "name slug")
        .sort(sorts[sort] || "-createdAt")
        .skip((page - 1) * limit)
        .limit(limit),
      Product.countDocuments(f),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  }),
);
r.get(
  "/products/:slug",
  wrap(async (req, res) => {
    const p = await Product.findOne({
      slug: req.params.slug,
      status: "published",
    }).populate("category", "name slug");
    if (!p) throw httpError(404, "Product not found");
    const related = await Product.find({
      category: p.category._id,
      _id: { $ne: p._id },
      status: "published",
    }).limit(4);
    res.json({ product: p, related });
  }),
);
export default r;
