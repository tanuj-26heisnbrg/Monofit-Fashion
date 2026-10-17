import "dotenv/config";
import mongoose from "mongoose";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import { slugify } from "../utils/helpers.js";
await mongoose.connect(process.env.MONGODB_URI);
const names = [
  "T-shirts",
  "Oversized T-shirts",
  "Shirts",
  "Jeans and Trousers",
  "Hoodies and Sweatshirts",
  "Tops",
  "Kurtis",
];
const cats = {};
for (const [i, n] of names.entries())
  cats[n] = await Category.findOneAndUpdate(
    { slug: slugify(n) },
    { name: n, slug: slugify(n), order: i },
    { upsert: true, new: true },
  );
const sz = (a) =>
  ["S", "M", "L", "XL"].map((s, i) => ({ size: s, stock: a[i] ?? 10 }));
const items = [
  ["Classic White Tee", "T-shirts", "unisex", 499, 299, true],
  ["Oversized Black Tee", "Oversized T-shirts", "men", 899, 599, true],
  ["Slim Fit Oxford Shirt", "Shirts", "men", 1299, 899, false],
  ["Straight Leg Jeans", "Jeans and Trousers", "women", 1999, 1399, true],
  ["Monochrome Hoodie", "Hoodies and Sweatshirts", "unisex", 1799, 1199, true],
  ["Ribbed Crop Top", "Tops", "women", 599, 399, false],
  ["Cotton Kurti", "Kurtis", "women", 999, 699, true],
  ["Relaxed Chinos", "Jeans and Trousers", "men", 1499, 999, false],
];
for (const [i, [name, cat, gender, mrp, price, nw]] of items.entries())
  await Product.findOneAndUpdate(
    { sku: "MF-" + (100 + i) },
    {
      name,
      slug: slugify(name),
      category: cats[cat]._id,
      gender,
      sku: "MF-" + (100 + i),
      mrp,
      price,
      discountPct: Math.round(((mrp - price) / mrp) * 100),
      sizes: sz([10, 10, 8, 0]),
      newArrival: nw,
      featured: i % 2 === 0,
      status: "published",
      description:
        "Sample product. Replace with real details and photos from the admin panel.",
    },
    { upsert: true },
  );
console.log(
  "Seeded categories and sample products (no photos: upload via admin).",
);
await mongoose.disconnect();
