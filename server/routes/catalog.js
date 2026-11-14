import { Router } from "express";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import { wrap } from "../utils/helpers.js";
import { httpError } from "../middleware/auth.js";
const r = Router();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    const [featured, newArrivals, bestSellers, sale, hangerCollection] = await Promise.all([
      pop(Product.find({ ...base, featured: true })),
      pop(Product.find({ ...base, newArrival: true }).sort("-createdAt")),
      pop(Product.find({ ...base, bestSeller: true }).sort("-sold")),
      pop(
        Product.find({
          ...base,
          onSale: true,
          $expr: { $lt: ["$price", { $multiply: ["$mrp", 0.85] }] },
        }).sort("-discountPct"),
      ),
      pop(Product.find({ ...base, hangerCollection: true })),
    ]);
    res.json({ featured, newArrivals, bestSellers, sale, hangerCollection });
  }),
);
r.get(
  "/products/suggest",
  wrap(async (req, res) => {
    const q = String(req.query.q || "").trim().slice(0, 80);
    if (q.length < 2) return res.json({ products: [], categories: [] });
    const regex = new RegExp(escapeRegex(q), "i");
    const categories = await Category.find({ active: true, name: regex })
      .select("name slug")
      .sort("order name")
      .limit(4);
    const categoryIds = categories.map((category) => category._id);
    const products = await Product.find({
      status: "published",
      $or: [
        { name: regex },
        { tags: regex },
        { colors: regex },
        ...(categoryIds.length ? [{ category: { $in: categoryIds } }] : []),
      ],
    })
      .select("name slug price images category")
      .populate("category", "name slug")
      .limit(8);
    products.sort((a, b) => {
      const rank = (product) => {
        const name = product.name.toLowerCase();
        const query = q.toLowerCase();
        return name === query ? 0 : name.startsWith(query) ? 1 : 2;
      };
      return rank(a) - rank(b);
    });
    res.json({ products, categories });
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
    if (q) {
      const query = String(q).trim().slice(0, 100);
      if (query) {
        const regex = new RegExp(escapeRegex(query), "i");
        const matchingCategories = await Category.find({ active: true, name: regex }).select("_id");
        f.$or = [
          { name: regex },
          { description: regex },
          { tags: regex },
          { colors: regex },
          ...(matchingCategories.length ? [{ category: { $in: matchingCategories.map((c) => c._id) } }] : []),
        ];
      }
    }
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
    if (req.query.featured) f.featured = true;
    if (req.query.bestSeller) f.bestSeller = true;
    if (req.query.hangerCollection) f.hangerCollection = true;
    if (req.query.onSale) {
      f.onSale = true;
      f.$expr = { $lt: ["$price", { $multiply: ["$mrp", 0.85] }] };
    }
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
